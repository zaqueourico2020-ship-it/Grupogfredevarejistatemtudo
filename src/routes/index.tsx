import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
// ... (rest of imports)

const OWNER_EMAIL = "grupogfredevarejistaoficial@gmail.com";

import { ServicosTab } from "@/components/servicos/ServicosTab";
import { MercadoTab } from "@/components/mercado/MercadoTab";
import {
  Menu, Search, ShoppingCart, Bell, X, Home as HomeIcon, Package, Heart, User,
  Grid, HelpCircle, Shield, Phone, Calendar, IdCard, MapPin, Camera, Edit,
  MessageCircle, Image as ImageIcon, Tag, ClipboardList, Plus, Trash2, Upload,
  Copy, Download, Check, Minus, LogOut, Star, Settings, Lock, Mail,
  CreditCard, Gift, Wallet, BellRing, DollarSign,
  Store, Eye, ChevronRight, ChevronDown, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, FileText,
  ArrowLeft, ChevronLeft,
  BadgeCheck, SlidersHorizontal, Truck, ShieldCheck, Headphones,
  Laptop, Smartphone, Gamepad2, Sofa, Sparkles, Trophy, Tv, Shirt,
  Coins, Ticket, RotateCcw, History, ClipboardCheck,
  Wrench, Handshake, Percent, Apple, ShoppingBag
} from "lucide-react";
import logo from "@/assets/gf-shield-logo.png";
import { createCheckout } from "@/lib/checkout.functions";
import { getWallet } from "@/lib/wallet.functions";
import {
  listNotifications, markNotificationRead, listCashback,
  adminCashbackReport, adminMarkExpiredTransferred, listMyOrders,
} from "@/lib/customer.functions";
import { activatePartnerSelf } from "@/lib/partners.functions";
import { listFeaturedPartners } from "@/lib/partner-panel.functions";
import { useStoreState } from "@/hooks/useStoreState";
import { BannerCarousel } from "@/components/BannerCarousel";
import { InstallAppButton } from "@/components/InstallAppButton";
import { OrderTrackingTimeline, STATUS_TO_STEP, trackingCodeFromId } from "@/components/OrderTracking";
import { CompraSeguraSeal, CompraSeguraTag } from "@/components/CompraSegura";
import { ChatButton } from "@/components/ChatWidget";
import GmailSupportTab from "@/components/GmailSupportTab";
import bannerEscolhaInteligente from "@/assets/banner-escolha-inteligente.png.asset.json";
import bannerMarketplace from "@/assets/banner-marketplace-grupo-gf.png.asset.json";
import bannerParceiro from "@/assets/banner-parceiro-grupo-gf.png.asset.json";
import bannerBoasVindas from "@/assets/banner-boas-vindas-grupo-gf.png.asset.json";


export default function Component() {
  // ... (rest of the component body - I need to make sure I don't delete everything)


/* ---------- Types & Storage ---------- */
type Product = {
  id: string; name: string; price: number; oldPrice?: number;
  category: string; subcategory?: string; image: string; description?: string; stock: number;
  sellerName?: string; partnerId?: string | null;
  notes?: string;
  images?: string[];
  variants?: ProductVariant[];
  estado?: string;
  cidade?: string;
  regiao?: string;
  bairro?: string;
};

function parseGeoNotes(notesStr?: string) {
  if (!notesStr) return { estado: "", cidade: "", regiao: "", bairro: "", notes: "" };
  try {
    if (notesStr.startsWith("_GEO_:")) {
      const parsed = JSON.parse(notesStr.substring(6));
      return {
        estado: parsed.estado || "",
        cidade: parsed.cidade || "",
        regiao: parsed.regiao || "",
        bairro: parsed.bairro || "",
        notes: parsed.notes || ""
      };
    }
  } catch (e) {
    // Ignore and fallback
  }
  return { estado: "", cidade: "", regiao: "", bairro: "", notes: notesStr };
}
type ProductVariant = {
  id: string;
  name: string;
  price: number;
  discount_price?: number | null;
  stock: number;
  image_url?: string | null;
  attributes?: { color?: string; size?: string } & Record<string, unknown>;
};
type StoreSettings = {
  storeName: string; whatsapp: string; cnpj: string; owner: string;
  address: string; email: string; instagram: string; deliveryFee: number; minOrder: number;
};
type Banner = { id: string; title: string; subtitle: string; image: string };
type Coupon = { code: string; discount: number; type: "percent" | "fixed" };
type CartItem = { productId: string; qty: number };
type Order = {
  id: string; date: string; items: { name: string; qty: number; price: number }[];
  total: number; status: "Pendente" | "Confirmado" | "Entregue";
  tracking?: string; history?: Record<string, string>;
};
type UserData = {
  name: string; phone: string; email: string; pin: string;
  cpf?: string; address?: string; birthdate?: string; avatar?: string;
  favorites: string[];
};

const WHATSAPP = "5542998722699";

const LS = {
  user: "gf_user",
  products: "gf_products",
  banners: "gf_banners",
  coupons: "gf_coupons",
  cart: "gf_cart",
  orders: "gf_orders",
  settings: "gf_settings",
  addresses: "gf_addresses",
  partners: "gf_featured_partners",
};

export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  zip: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
  isDefault?: boolean;
};

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "GRUPO GF REDE VAREJISTA",
  whatsapp: "5542998722699",
  cnpj: "55.844.536/0001-85",
  owner: "Ezequiel de Farias Carvalho",
  address: "",
  email: "",
  instagram: "",
  deliveryFee: 0,
  minOrder: 300,
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}
function save<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

const seedProducts: Product[] = [];
const seedBanners: Banner[] = [
  { id: "gf-escolha", title: "A escolha inteligente para você", subtitle: "Qualidade, segurança e as melhores condições", image: bannerEscolhaInteligente.url },
  { id: "gf-marketplace", title: "Marketplace Grupo GF", subtitle: "Tudo o que você procura em um só lugar", image: bannerMarketplace.url },
  { id: "gf-parceiro", title: "Torne-se um parceiro do Grupo GF", subtitle: "Cadastre sua loja e comece a vender", image: bannerParceiro.url },
  { id: "gf-boas-vindas", title: "Bem-vindo ao Grupo GF", subtitle: "Qualidade, economia e confiança", image: bannerBoasVindas.url },
];

// Module-level caches so navigating away and pressing the browser Back
// button doesn't blank out the home screen while async loaders re-run.
let cachedDbProducts: Product[] = load<Product[]>(LS.products, []);
let cachedUser: UserData | null = null;
let cachedUserId: string | null = null;
let cachedUserType: "lojista" | "pessoa_fisica" | null = null;
let cachedTab: Tab = "home";
let cachedCart: CartItem[] | null = null;
let cachedOrders: Order[] | null = null;
let cachedActiveCategory: string = "Todas";
let cachedFeaturedPartners: any[] = load<any[]>(LS.partners, []);
const seedCoupons: Coupon[] = [
  { code: "BEMVINDO10", discount: 10, type: "percent" },
  { code: "GF20", discount: 20, type: "fixed" },
];

/* ---------- Categories Tree ---------- */
import { CATEGORIES_TREE as CATEGORIES_TREE_EXT, ALL_CATEGORIES as ALL_CATEGORIES_EXT } from "@/lib/categories";
const CATEGORIES_TREE = CATEGORIES_TREE_EXT;
const ALL_CATEGORIES = ALL_CATEGORIES_EXT;



/* ---------- Helpers ---------- */
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }
const uid = () => Math.random().toString(36).slice(2, 10);
const fallbackProductImage = logo;

export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (url.startsWith("/__l5e/")) {
    return `https://586ab126-c0cf-4b79-a041-d525414f4e3c.lovableproject.com${url}`;
  }
  return url;
}

function getSubcategoryImage(category: string, subcategory: string, productsList: Product[] = []) {
  // 1. Try to find an actual product with this category and subcategory
  const match = productsList.find(
    p => p.category === category && p.subcategory === subcategory && p.image
  );
  if (match) return match.image;

  const sub = subcategory.toLowerCase();

  // Electronics & Tech
  if (sub.includes("fone") || sub.includes("headset") || sub.includes("earbud")) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80"; // Headphones
  }
  if (sub.includes("caixa") || sub.includes("bluetooth") || sub.includes("som") || sub.includes("soundbar") || sub.includes("alto-falante")) {
    return "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=150&q=80"; // Speaker
  }
  if (sub.includes("smartphone") || sub.includes("iphone") || sub.includes("celular")) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=150&q=80"; // Phone
  }
  if (sub.includes("capa") || sub.includes("capinha") || sub.includes("case")) {
    return "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=150&q=80"; // Case
  }
  if (sub.includes("pelicula") || sub.includes("vidro")) {
    return "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=150&q=80"; // Screen protector
  }
  if (sub.includes("notebook") || sub.includes("macbook") || sub.includes("computador") || sub.includes("desktop")) {
    return "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=150&q=80"; // Computer/Laptop
  }
  if (sub.includes("teclado")) {
    return "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=150&q=80"; // Keyboard
  }
  if (sub.includes("mouse")) {
    return "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=150&q=80"; // Mouse
  }
  if (sub.includes("monitor")) {
    return "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=150&q=80"; // Monitor
  }
  if (sub.includes("carregador") || sub.includes("powerbank") || sub.includes("bateria")) {
    return "https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?w=150&q=80"; // Charger / power bank
  }
  if (sub.includes("playstation") || sub.includes("xbox") || sub.includes("nintendo") || sub.includes("console") || sub.includes("game") || sub.includes("jogos") || sub.includes("videogame")) {
    return "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&q=80"; // Gaming
  }
  if (sub.includes("drone")) {
    return "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=150&q=80"; // Drone
  }
  if (sub.includes("camera") || sub.includes("dslr") || sub.includes("lente") || sub.includes("foto")) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=150&q=80"; // Camera
  }
  if (sub.includes("tv") || sub.includes("televisor") || sub.includes("video")) {
    return "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150&q=80"; // TV
  }

  // Home & Kitchen Appliances
  if (sub.includes("geladeira") || sub.includes("refrigerador")) {
    return "https://images.unsplash.com/photo-1571175432247-52319022938e?w=150&q=80"; // Refrigerator
  }
  if (sub.includes("fogao") || sub.includes("forno") || sub.includes("cooktop")) {
    return "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=150&q=80"; // Stove
  }
  if (sub.includes("micro-ondas") || sub.includes("microondas")) {
    return "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=150&q=80"; // Microwave
  }
  if (sub.includes("ar condicionado") || sub.includes("aquecedor") || sub.includes("ventilador")) {
    return "https://images.unsplash.com/photo-1527419220450-4824e235a947?w=150&q=80"; // AC
  }
  if (sub.includes("maquina de lavar") || sub.includes("lavadora") || sub.includes("secadora")) {
    return "https://images.unsplash.com/photo-1582730149719-61124885a646?w=150&q=80"; // Washer
  }
  if (sub.includes("aspirador") || sub.includes("vassoura") || sub.includes("limpeza")) {
    return "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=150&q=80"; // Vacuum
  }
  if (sub.includes("sofa") || sub.includes("poltrona")) {
    return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=150&q=80"; // Sofa
  }
  if (sub.includes("cama") || sub.includes("colchao") || sub.includes("travesseiro")) {
    return "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=150&q=80"; // Bed
  }
  if (sub.includes("mesa") || sub.includes("cadeira") || sub.includes("escritorio") || sub.includes("banco")) {
    return "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=150&q=80"; // Table & Chair
  }
  if (sub.includes("armario") || sub.includes("guarda-roupa") || sub.includes("comoda") || sub.includes("estante")) {
    return "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=150&q=80"; // Cabinet
  }

  // Fashion & Apparel
  if (sub.includes("vestido") || sub.includes("vestidos")) {
    return "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=150&q=80"; // Dress
  }
  if (sub.includes("calca") || sub.includes("calcas") || sub.includes("jeans")) {
    return "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=150&q=80"; // Pants
  }
  if (sub.includes("legging") || sub.includes("pantufa") || sub.includes("meia") || sub.includes("meias")) {
    return "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?w=150&q=80"; // Socks / Leggings
  }
  if (sub.includes("camisa") || sub.includes("camisas") || sub.includes("camiseta") || sub.includes("camisetas") || sub.includes("regata") || sub.includes("polo")) {
    return "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=150&q=80"; // T-shirt / Shirt
  }
  if (sub.includes("agasalho") || sub.includes("moletom") || sub.includes("jaqueta") || sub.includes("casaco") || sub.includes("blazer") || sub.includes("sueter") || sub.includes("cardigan")) {
    return "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=150&q=80"; // Jacket / Hoodie
  }
  if (sub.includes("blusa") || sub.includes("blusas") || sub.includes("cropped") || sub.includes("top")) {
    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&q=80"; // Blouse
  }
  if (sub.includes("saia") || sub.includes("saias") || sub.includes("shorts") || sub.includes("bermuda") || sub.includes("bermudas") || sub.includes("short")) {
    return "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=150&q=80"; // Skirt / Shorts
  }
  if (sub.includes("tenis") || sub.includes("sapato") || sub.includes("sapatos") || sub.includes("sandalia") || sub.includes("bota") || sub.includes("chinelo") || sub.includes("salto") || sub.includes("sapatilha") || sub.includes("calcado") || sub.includes("calcados")) {
    return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80"; // Shoe / Sneaker
  }
  if (sub.includes("mala") || sub.includes("malas") || sub.includes("mochila") || sub.includes("bolsa") || sub.includes("bolsas") || sub.includes("carteira")) {
    return "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=150&q=80"; // Bag / Purse / Luggage
  }
  if (sub.includes("lingerie") || sub.includes("cueca") || sub.includes("calcinha") || sub.includes("pijama") || sub.includes("dormir") || sub.includes("intima") || sub.includes("sutia")) {
    return "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=150&q=80"; // Intimate/sleeping wear
  }
  if (sub.includes("praia") || sub.includes("biquini") || sub.includes("maio") || sub.includes("sunga")) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&q=80"; // Beachwear
  }
  if (sub.includes("oculos") || sub.includes("bone") || sub.includes("relogio") || sub.includes("cinto") || sub.includes("joia") || sub.includes("anel") || sub.includes("brinco") || sub.includes("colar") || sub.includes("pulseira") || sub.includes("acessorio")) {
    return "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=150&q=80"; // Sunglasses/Watch/Accessory
  }

  // Beauty, Health & Wellness
  if (sub.includes("batom") || sub.includes("rimel") || sub.includes("base") || sub.includes("maquiagem") || sub.includes("paleta")) {
    return "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&q=80"; // Makeup
  }
  if (sub.includes("perfume") || sub.includes("fragrancia") || sub.includes("colonia")) {
    return "https://images.unsplash.com/photo-1541643600914-78b084683601?w=150&q=80"; // Perfume
  }
  if (sub.includes("shampoo") || sub.includes("condicionador") || sub.includes("creme") || sub.includes("cabelo") || sub.includes("pente") || sub.includes("escova")) {
    return "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=150&q=80"; // Hair Care
  }
  if (sub.includes("pele") || sub.includes("sabonete") || sub.includes("hidratante") || sub.includes("protetor solar") || sub.includes("skincare")) {
    return "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=150&q=80"; // Skin Care
  }
  if (sub.includes("vitamina") || sub.includes("suplemento") || sub.includes("whey") || sub.includes("creatina")) {
    return "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=150&q=80"; // Supplements
  }
  if (sub.includes("termometro") || sub.includes("pressao") || sub.includes("mascara") || sub.includes("saude") || sub.includes("remedio")) {
    return "https://images.unsplash.com/photo-1584515979956-d9b6e5d09982?w=150&q=80"; // Health
  }

  // Sports & Outdoors
  if (sub.includes("bola") || sub.includes("futebol") || sub.includes("basquete") || sub.includes("chuteira") || sub.includes("camisa de time")) {
    return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150&q=80"; // Ball/Soccer
  }
  if (sub.includes("haltere") || sub.includes("peso") || sub.includes("elastico") || sub.includes("tapete") || sub.includes("academia") || sub.includes("fitness") || sub.includes("esteira")) {
    return "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&q=80"; // Fitness
  }
  if (sub.includes("barraca") || sub.includes("camping") || sub.includes("pesca") || sub.includes("mochila de trilha") || sub.includes("lanterna")) {
    return "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=150&q=80"; // Camping
  }
  if (sub.includes("bicicleta") || sub.includes("bike") || sub.includes("capacete") || sub.includes("ciclismo")) {
    return "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=150&q=80"; // Bicycle
  }

  // Automotive, Tools & Build
  if (sub.includes("oleo") || sub.includes("pneu") || sub.includes("acessorio automotivo") || sub.includes("limpador") || sub.includes("carro") || sub.includes("moto")) {
    return "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150&q=80"; // Car Accessories
  }
  if (sub.includes("furadeira") || sub.includes("parafusadeira") || sub.includes("ferramenta") || sub.includes("chave de fenda") || sub.includes("martelo") || sub.includes("alicate")) {
    return "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=150&q=80"; // Tools
  }
  if (sub.includes("lampada") || sub.includes("led") || sub.includes("lustre") || sub.includes("luminaria") || sub.includes("iluminacao")) {
    return "https://images.unsplash.com/photo-1550985616-10810253b84d?w=150&q=80"; // Lighting
  }

  // Toys, Kids & Babies
  if (sub.includes("brinquedo") || sub.includes("boneca") || sub.includes("carrinho") || sub.includes("lego") || sub.includes("quebra-cabeca")) {
    return "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=150&q=80"; // Toy
  }
  if (sub.includes("fralda") || sub.includes("bebe") || sub.includes("mamadeira") || sub.includes("bico") || sub.includes("chupeta")) {
    return "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=150&q=80"; // Baby Care
  }

  // Paper & Books
  if (sub.includes("caderno") || sub.includes("caneta") || sub.includes("lapis") || sub.includes("estojo") || sub.includes("papelaria") || sub.includes("papel")) {
    return "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=150&q=80"; // Stationery
  }
  if (sub.includes("livro") || sub.includes("livros") || sub.includes("leitura") || sub.includes("romance") || sub.includes("didatico")) {
    return "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=150&q=80"; // Books
  }

  // Pet Shop
  if (sub.includes("racao") || sub.includes("pet") || sub.includes("cachorro") || sub.includes("gato") || sub.includes("coleira") || sub.includes("aquario")) {
    return "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=150&q=80"; // Pet Shop
  }

  // Instruments
  if (sub.includes("violao") || sub.includes("guitarra") || sub.includes("teclado musical") || sub.includes("bateria") || sub.includes("microfone") || sub.includes("instrumento")) {
    return "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=150&q=80"; // Music
  }

  // Food & Drinks
  if (sub.includes("chocolate") || sub.includes("cafe") || sub.includes("bebida") || sub.includes("vinho") || sub.includes("cerveja") || sub.includes("alimento")) {
    return "https://images.unsplash.com/photo-1547592180-85f173990554?w=150&q=80"; // Food / Drink
  }

  // 2. Try to find any product in this main category
  const catMatch = productsList.find(p => p.category === category && p.image);
  if (catMatch) return catMatch.image;

  // 3. Fallback per-category list (default)
  const fallbackImages: Record<string, string> = {
    "Eletrônicos": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80",
    "Celulares e Smartphones": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=150&q=80",
    "Informática": "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=150&q=80",
    "Games": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150&q=80",
    "TVs, Áudio e Vídeo": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=150&q=80",
    "Eletrodomésticos": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=150&q=80",
    "Casa, Móveis e Decoração": "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=150&q=80",
    "Construção e Ferramentas": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=150&q=80",
    "Iluminação": "https://images.unsplash.com/photo-1550985616-10810253b84d?w=150&q=80",
    "Materiais Elétricos": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150&q=80",
    "Materiais Hidráulicos": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=150&q=80",
    "Automotivo": "https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=150&q=80",
    "Agro e Máquinas": "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=150&q=80",
    "Moda Feminina": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=150&q=80",
    "Moda Masculina": "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?w=150&q=80",
    "Moda Infantil": "https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=150&q=80",
    "Calçados": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&q=80",
    "Bolsas e Acessórios": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=150&q=80",
    "Beleza e Perfumaria": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=150&q=80",
    "Saúde": "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=150&q=80",
    "Esportes e Fitness": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&q=80",
    "Camping e Pesca": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=150&q=80",
    "Bebês": "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=150&q=80",
    "Brinquedos": "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=150&q=80",
    "Papelaria": "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=150&q=80",
    "Livros": "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=150&q=80"
  };

  return fallbackImages[category] || "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=150&q=80";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  }
}

/* ---------- App ---------- */
type Tab = "home" | "categories" | "cart" | "orders" | "profile" | "faq" | "admin" | "favorites" | "notifications" | "cashback" | "gmail" | "servicos";

function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserData | null>(() => cachedUser);
  const [userId, setUserId] = useState<string | null>(() => cachedUserId);
  const [userType, setUserType] = useState<"lojista" | "pessoa_fisica" | null>(() => cachedUserType);
  const [tab, setTab] = useState<Tab>(() => cachedTab);
  const [partners, setPartners] = useState<any[]>(() => cachedFeaturedPartners);
  const fn = useServerFn(listFeaturedPartners);
  useEffect(() => {
    console.log("Loading partners...");
    let cancelled = false;
    fn({})
      .then((r: any) => {
        if (cancelled) return;
        console.log("Partners loaded:", r.partners);
        const next = r.partners ?? [];
        cachedFeaturedPartners = next;
        save(LS.partners, next);
        setPartners(next);
      })
      .catch(async (e) => {
        console.error("Error loading partners:", e);
        if (cancelled) return;
        try {
          const { data, error } = await (supabase as any)
            .from("partners")
            .select("id, slug, nome_loja, logo_url, banner_url")
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(12);
          if (!error && data) {
            console.log("Fallback partners loaded:", data);
            cachedFeaturedPartners = data;
            save(LS.partners, data);
            setPartners(data);
            return;
          }
          console.error("Fallback error:", error);
        } catch (e2) {
          console.error("Fallback catch error:", e2);
        }
        if (cachedFeaturedPartners.length) setPartners(cachedFeaturedPartners);
      }
    return () => { cancelled = true; };
  }, [fn]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  /* Shared store state (products/banners/coupons/settings) lives in the DB so
     admin edits propagate to every client in real time. */
  const { state: storeState, mutate: mutateStore } = useStoreState({
    products: seedProducts,
    banners: seedBanners,
    coupons: seedCoupons,
    settings: DEFAULT_SETTINGS,
  }
  const legacyProducts = storeState.products as Product[];
  const [dbProducts, setDbProducts] = useState<Product[]>(() => cachedDbProducts);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const adminRes = await supabase
        .from("products")
        .select("id,name,price,discount_price,image_url,images,stock_quantity,category,subcategory,active,description,notes,product_variants:product_variants!product_variants_product_id_fkey(id,name,price,discount_price,stock,image_url,attributes)")
        .eq("active", true)
        .order("created_at", { ascending: false }
      const partnerRes = await (supabase as any)
        .from("partner_products")
        .select("id,name,price,discount_price,image_url,images,stock_quantity,category,subcategory,active,description,notes,approval_status,partner_id,product_variants:product_variants!product_variants_partner_product_id_fkey(id,name,price,discount_price,stock,image_url,attributes)")
        .eq("active", true)
        .eq("approval_status", "approved")
        .order("created_at", { ascending: false }
      if (adminRes.error) console.error("[home products]", adminRes.error.message);
      if (partnerRes.error) console.error("[home partner_products]", partnerRes.error.message);
      if (cancelled) return;
      const mapAdmin = (p: any): Product => {
        const geo = parseGeoNotes(p.notes);
        return {
          id: p.id,
          name: p.name,
          price: Number(p.discount_price ?? p.price) || 0,
          oldPrice: p.discount_price != null && Number(p.discount_price) < Number(p.price) ? Number(p.price) : undefined,
          category: p.category || "Outros",
          subcategory: p.subcategory || undefined,
          image: p.image_url || fallbackProductImage,
          description: p.description || undefined,
          stock: Number(p.stock_quantity) || 0,
          sellerName: "GRUPO GF REDE VAREJISTA",
          partnerId: null,
          notes: geo.notes || undefined,
          images: Array.isArray(p.images) ? p.images : [],
          variants: Array.isArray(p.product_variants) ? p.product_variants.map((v: any) => ({
            id: v.id, name: v.name, price: Number(v.price) || 0,
            discount_price: v.discount_price != null ? Number(v.discount_price) : null,
            stock: Number(v.stock) || 0, image_url: v.image_url, attributes: v.attributes || {},
          })) : [],
          estado: geo.estado || undefined,
          cidade: geo.cidade || undefined,
          regiao: geo.regiao || undefined,
          bairro: geo.bairro || undefined,
        };
      };
      const mapPartner = (p: any): Product => ({
        ...mapAdmin(p),
        sellerName: "Loja parceira",
        partnerId: p.partner_id || null,
      }
      const merged: Product[] = [];
      if (!adminRes.error && adminRes.data) merged.push(...adminRes.data.map(mapAdmin));
      if (!partnerRes.error && partnerRes.data) merged.push(...partnerRes.data.map(mapPartner));
      if (!adminRes.error || !partnerRes.error) {
        cachedDbProducts = merged;
        save(LS.products, merged);
        setDbProducts(merged);
      } else if (cachedDbProducts.length) {
        setDbProducts(cachedDbProducts);
      }
    };
    load();
    const ch = supabase
      .channel("products_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_products" }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);
  const products = useMemo<Product[]>(() => {
    const map = new Map<string, Product>();
    for (const p of legacyProducts) map.set(p.id, p);
    for (const p of dbProducts) map.set(p.id, p); // db wins on conflict
    return Array.from(map.values());
  }, [legacyProducts, dbProducts]);
  const banners = useMemo<Banner[]>(() => {
    const configured = (storeState.banners as Banner[]) || [];
    const byId = new Map(seedBanners.map((banner) => [banner.id, { ...banner, image: resolveImageUrl(banner.image) }]));
    for (const banner of configured) {
      if (banner && banner.id) {
        const seed = seedBanners.find(s => s.id === banner.id);
        if (seed) {
          const hasValidImage = banner.image && (banner.image.startsWith("/__l5e/") || banner.image.startsWith("data:") || banner.image.startsWith("http"));
          byId.set(banner.id, {
            ...banner,
            image: resolveImageUrl(hasValidImage ? banner.image : seed.image)
          }
        } else {
          byId.set(banner.id, {
            ...banner,
            image: resolveImageUrl(banner.image)
          }
        }
      }
    }
    return Array.from(byId.values());
  }, [storeState.banners]);
  const coupons = storeState.coupons as Coupon[];
  const settings = { ...DEFAULT_SETTINGS, ...(storeState.settings as Partial<StoreSettings>) };
  const setProducts = (next: Product[] | ((prev: Product[]) => Product[])) => {
    const v = typeof next === "function" ? (next as any)(products) : next;
    mutateStore({ products: v }
  };
  const setBanners = (next: Banner[] | ((prev: Banner[]) => Banner[])) => {
    const v = typeof next === "function" ? (next as any)(banners) : next;
    mutateStore({ banners: v }
  };
  const setCoupons = (next: Coupon[] | ((prev: Coupon[]) => Coupon[])) => {
    const v = typeof next === "function" ? (next as any)(coupons) : next;
    mutateStore({ coupons: v }
  };
  const setSettings = (next: StoreSettings | ((prev: StoreSettings) => StoreSettings)) => {
    const v = typeof next === "function" ? (next as any)(settings) : next;
    mutateStore({ settings: v }
  };

  const [cart, setCart] = useState<CartItem[]>(() => cachedCart ?? []);
  const [orders, setOrders] = useState<Order[]>(() => cachedOrders ?? []);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCidade, setFilterCidade] = useState("");
  const [filterRegiao, setFilterRegiao] = useState("");
  const [filterBairro, setFilterBairro] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(() => cachedActiveCategory);
  const [selectedSidebarCategory, setSelectedSidebarCategory] = useState<string>(() => ALL_CATEGORIES[0] || "Eletrônicos");
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "discount" | "name">("relevance");
  const [maxPrice, setMaxPrice] = useState<number>(0); // 0 = no limit
  const [showFilters, setShowFilters] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [mpLoading, setMpLoading] = useState(false);
  const createCheckoutFn = useServerFn(createCheckout);
  const fetchNotifications = useServerFn(listNotifications);
  const markNotifRead = useServerFn(markNotificationRead);
  const fetchCashback = useServerFn(listCashback);
  const fetchMyOrders = useServerFn(listMyOrders);
  const [remoteOrders, setRemoteOrders] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [cashback, setCashback] = useState<{ available: number; totalEarned: number; totalUsed: number; totalExpired: number; credits: any[] }>({ available: 0, totalEarned: 0, totalUsed: 0, totalExpired: 0, credits: [] }
  const [useCashbackAmount, setUseCashbackAmount] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);
  const [addressesList, setAddressesList] = useState<Address[]>(() => load<Address[]>(LS.addresses, []));
  const [openAddressesGlobal, setOpenAddressesGlobal] = useState(false);

  const defaultAddress = useMemo(() => {
    return addressesList.find(a => a.isDefault) || addressesList[0];
  }, [addressesList]);

  const addressText = useMemo(() => {
    return defaultAddress 
      ? `${defaultAddress.street}, ${defaultAddress.number}`
      : (user ? user.name.split(" ")[0] : "Selecionar endereço");
  }, [defaultAddress, user]);

  const [lastViewedId, setLastViewedId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const navigate = useNavigate();
  const activatePartner = useServerFn(activatePartnerSelf);
  const [partnerActivating, setPartnerActivating] = useState(false);
  const signOutToLogin = useCallback(async () => {
    setDrawerOpen(false);
    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" } as any),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {}
    try { localStorage.removeItem(LS.user); } catch {}
    cachedUser = null;
    cachedUserId = null;
    cachedUserType = null;
    cachedTab = "home";
    setUser(null);
    setUserId(null);
    setUserType(null);
    setIsOwner(false);
    setIsPartner(false);
    setTab("home");
    navigate({ to: "/auth", replace: true }
  }, [navigate]);
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email?.toLowerCase().trim() ?? "";
      const uid = data.user?.id;
      if (!uid) { setIsOwner(false); setIsPartner(false); if (email === OWNER_EMAIL) setIsOwner(true); return; }
      try {
        if (email === OWNER_EMAIL) {
          await (supabase as any).rpc("ensure_designated_owner_role");
        }
        const { data: roles } = await (supabase as any)
          .from("user_roles").select("role").eq("user_id", uid)
          .in("role", ["admin", "owner", "partner"]);
        const r = (roles ?? []).map((x: any) => x.role);
        setIsOwner(email === OWNER_EMAIL || r.includes("admin") || r.includes("owner"));
        if (r.includes("partner")) {
          setIsPartner(true);
        } else {
          const { data: partner } = await (supabase as any)
            .from("partners")
            .select("status")
            .eq("user_id", uid)
            .eq("status", "approved")
            .maybeSingle();
          setIsPartner(Boolean(partner));
        }
      } catch { setIsOwner(email === OWNER_EMAIL); setIsPartner(false); }
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleActivatePartner = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setDrawerOpen(false);
      navigate("/auth");
      return;
    }
    if (partnerActivating) return;
    setPartnerActivating(true);
    try {
      const result = await activatePartner({}
      if (result && "ok" in result && !result.ok) {
        throw new Error((result as any).error || "Não foi possível ativar Parceiro GF agora.");
      }
      setIsPartner(true);
      setDrawerOpen(false);
      setTab("home");
      setToast("Parabéns! Sua conta Parceiro GF foi ativada com sucesso.");
      setTimeout(() => setToast(null), 4000);
    } catch (e: any) {
      setToast(e?.message || "Falha ao ativar Parceiro GF.");
      setTimeout(() => setToast(null), 4000);
    } finally {
      setPartnerActivating(false);
    }
  }, [activatePartner, navigate, partnerActivating]);
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [delivery, setDelivery] = useState({
    customerName: "", customerPhone: "", customerEmail: "",
    recipientName: "", recipientPhone: "",
    zip: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", reference: "", notes: "",
  }

  const refreshNotifs = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await fetchNotifications({}
      setNotifs(r.notifications);
    } catch (e) { console.error(e); }
  }, [userId, fetchNotifications]);

  const refreshCashback = useCallback(async () => {
    if (!userId) return;
    try {
      const r = await fetchCashback({}
      setCashback(r);
    } catch (e) { console.error(e); }
  }, [userId, fetchCashback]);

  const refreshMyOrders = useCallback(async () => {
    if (!userId) { setRemoteOrders([]); return; }
    try {
      const r = await fetchMyOrders({}
      setRemoteOrders(r.orders ?? []);
    } catch (e) { console.error(e); }
  }, [userId, fetchMyOrders]);


  /* Load local-only state (cart, orders) + Supabase user */
  useEffect(() => {
    if (cachedCart === null) setCart(load<CartItem[]>(LS.cart, []));
    if (cachedOrders === null) setOrders(load<Order[]>(LS.orders, []));
    try {
      const stored = localStorage.getItem("gf_last_viewed");
      if (stored) setLastViewedId(stored);
    } catch (e) {}

    const applyAuthUser = (authUser: any | null) => {
      if (!authUser) {
        setUser(null);
        setUserId(null);
        setUserType(null);
        return;
      }
      const meta = (authUser.user_metadata ?? {}) as Record<string, string>;
      const localUser = load<UserData | null>(LS.user, null);
      setUserType(meta.user_type === "lojista" ? "lojista" : "pessoa_fisica");
      setUserId(authUser.id);
      setUser({
        name: meta.full_name || authUser.email?.split("@")[0] || "Cliente",
        phone: meta.phone || "",
        email: authUser.email || "",
        pin: "",
        avatar: meta.avatar || localUser?.avatar || "",
        favorites: localUser?.favorites ?? [],
      }
    };

    let mounted = true;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;
        applyAuthUser(sessionData.session?.user ?? null);
      } catch (e) {
        console.error("[init] session check failed:", e);
      } finally {
        if (mounted) setReady(true);
      }

      try {
        const { data } = await supabase.auth.getUser();
        if (mounted && data?.user) applyAuthUser(data.user);
      } catch (e) {
        console.error("[init] auth check failed:", e);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      applyAuthUser(session?.user ?? null);
      setReady(true);
    }
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  /* Load notifications + cashback once user is known, plus poll every 30s */
  useEffect(() => {
    if (!userId) return;
    refreshNotifs();
    refreshCashback();
    refreshMyOrders();
    const i = setInterval(() => { refreshNotifs(); refreshCashback(); refreshMyOrders(); }, 30000);
    return () => clearInterval(i);
  }, [userId, refreshNotifs, refreshCashback, refreshMyOrders]);


  /* Mercado Pago checkout return */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (status === "approved") {
      setToast("Pagamento aprovado! Obrigado.");
      setTimeout(() => setToast(null), 3000);
      setCart([]); setAppliedCoupon(null); setCouponInput(""); setUseCashbackAmount(0);
      setTab("orders");
      window.history.replaceState({}, "", window.location.pathname);
      const tryRefresh = () => { fetchNotifications({}).then(r => setNotifs(r.notifications)).catch(() => {} fetchCashback({}).then(r => setCashback(r)).catch(() => {} fetchMyOrders({}).then(r => setRemoteOrders(r.orders ?? [])).catch(() => {} };
      setTimeout(tryRefresh, 2500);
      setTimeout(tryRefresh, 8000);

    } else if (status === "pending") {
      setToast("Pagamento pendente. Avisaremos quando confirmar.");
      setTimeout(() => setToast(null), 3500);
      setTab("orders");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (status === "failure") {
      setToast("Pagamento não concluído.");
      setTimeout(() => setToast(null), 3000);
      setTab("cart");
      window.history.replaceState({}, "", window.location.pathname);
    }

  }, []);

  /* Persist local-only state and mirror to module cache so Back-navigation
     remounts of the home route show data immediately instead of flashing
     empty UI. */
  useEffect(() => { cachedCart = cart; if (ready) save(LS.cart, cart); }, [cart, ready]);
  useEffect(() => { cachedOrders = orders; if (ready) save(LS.orders, orders); }, [orders, ready]);
  useEffect(() => { cachedUser = user; if (ready && user) save(LS.user, user); }, [user, ready]);
  useEffect(() => { cachedUserId = userId; }, [userId]);
  useEffect(() => { cachedUserType = userType; }, [userType]);
  useEffect(() => { cachedTab = tab; }, [tab]);
  useEffect(() => { cachedActiveCategory = activeCategory; }, [activeCategory]);

  /* Ensure seedBanners are synchronized in the Supabase database */
  useEffect(() => {
    if (!ready) return;
    const dbBanners = (storeState.banners as Banner[]) || [];
    const hasAllSeeds = seedBanners.every(seed => 
      dbBanners.some(db => db && db.id === seed.id && db.image === seed.image)
    );
    if (!hasAllSeeds) {
      const nextBannersMap = new Map(seedBanners.map(b => [b.id, b]));
      for (const b of dbBanners) {
        if (b && b.id && !nextBannersMap.has(b.id)) {
          nextBannersMap.set(b.id, b);
        }
      }
      mutateStore({ banners: Array.from(nextBannersMap.values()) }
    }
  }, [ready, storeState.banners, mutateStore]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const categories = useMemo(() => {
    const fromProducts = new Set(products.map(p => p.category));
    const merged = Array.from(new Set([...ALL_CATEGORIES, ...fromProducts]));
    return ["Todas", ...merged];
  }, [products]);

  const lastViewedProduct = useMemo(() => {
    if (!lastViewedId) return null;
    return products.find(p => p.id === lastViewedId);
  }, [lastViewedId, products]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);


  const priceCeiling = useMemo(() => Math.max(50, ...products.map(p => p.price)), [products]);

  const filtered = useMemo(() => {
    const arr = products.filter(p => {
      if (activeCategory !== "Todas" && p.category !== activeCategory) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (maxPrice > 0 && p.price > maxPrice) return false;
      
      // Geographic filter constraints
      if (filterEstado) {
        if (!p.estado || p.estado.toLowerCase() !== filterEstado.toLowerCase()) return false;
      }
      if (filterCidade) {
        if (!p.cidade || !p.cidade.toLowerCase().includes(filterCidade.toLowerCase())) return false;
      }
      if (filterRegiao) {
        if (!p.regiao || !p.regiao.toLowerCase().includes(filterRegiao.toLowerCase())) return false;
      }
      if (filterBairro) {
        if (!p.bairro || !p.bairro.toLowerCase().includes(filterBairro.toLowerCase())) return false;
      }
      
      return true;
    }
    const sorted = [...arr];
    if (sortBy === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "discount") sorted.sort((a, b) => {
      const da = a.oldPrice ? (1 - a.price / a.oldPrice) : 0;
      const db = b.oldPrice ? (1 - b.price / b.oldPrice) : 0;
      return db - da;
    }
    return sorted;
  }, [products, activeCategory, search, sortBy, maxPrice, filterEstado, filterCidade, filterRegiao, filterBairro]);

  const cartDetailed = useMemo(() => {
    return cart.map(ci => {
      const p = products.find(x => x.id === ci.productId);
      return p ? { product: p, qty: ci.qty } : null;
    }).filter(Boolean) as { product: Product; qty: number }[];
  }, [cart, products]);

  const subtotal = cartDetailed.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discount = !appliedCoupon ? 0
    : appliedCoupon.type === "percent" ? subtotal * appliedCoupon.discount / 100
    : Math.min(appliedCoupon.discount, subtotal);
  const maxCashbackUsable = Math.min(cashback.available, Math.max(0, subtotal - discount));
  const cashbackApplied = Math.min(useCashbackAmount, maxCashbackUsable);
  const total = Math.max(0, subtotal - discount - cashbackApplied);
  const wholesaleMin = userType === "lojista" ? Number(settings.minOrder || 0) : 0;
  const belowMin = wholesaleMin > 0 && subtotal < wholesaleMin;
  const unreadNotifs = notifs.filter(n => !n.read).length;


  /* Actions */
  const addToCart = (id: string) => {
    setCart(c => {
      const ex = c.find(i => i.productId === id);
      if (ex) return c.map(i => i.productId === id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { productId: id, qty: 1 }];
    }
    showToast("Adicionado ao carrinho");
  };
  const changeQty = (id: string, delta: number) => {
    setCart(c => c.flatMap(i => {
      if (i.productId !== id) return [i];
      const q = i.qty + delta;
      return q <= 0 ? [] : [{ ...i, qty: q }];
    }));
  };
  const removeFromCart = (id: string) => setCart(c => c.filter(i => i.productId !== id));

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = coupons.find(c => c.code === code);
    if (!found) { showToast("Cupom inválido"); return; }
    setAppliedCoupon(found);
    showToast("Cupom aplicado!");
  };

  const toggleFavorite = (id: string) => {
    if (!user) return;
    const favs = user.favorites.includes(id)
      ? user.favorites.filter(x => x !== id)
      : [...user.favorites, id];
    setUser({ ...user, favorites: favs }
  };

  const checkout = (method: "whatsapp" | "pickup") => {
    if (cartDetailed.length === 0) return;
    if (belowMin) { showToast(`Pedido mínimo do atacado: ${brl(wholesaleMin)}`); return; }
    const oid = uid();
    const order: Order = {
      id: oid,
      date: new Date().toLocaleString("pt-BR"),
      items: cartDetailed.map(i => ({ name: i.product.name, qty: i.qty, price: i.product.price })),
      total,
      status: "Pendente",
      tracking: trackingCodeFromId(oid),
      history: { received: new Date().toISOString() },
    };
    setOrders(o => [order, ...o]);
    const msg = encodeURIComponent(
      `*Novo Pedido — GRUPO GF REDE VAREJISTA*\nCliente: ${user?.name}\n\n` +
      cartDetailed.map(i => `• ${i.qty}x ${i.product.name} — ${brl(i.product.price * i.qty)}`).join("\n") +
      (appliedCoupon ? `\nCupom: ${appliedCoupon.code} (-${brl(discount)})` : "") +
      `\n\n*Total: ${brl(total)}*\nMétodo: ${method === "whatsapp" ? "WhatsApp" : "Retirada"}`
    );
    window.open(`https://wa.me/${settings.whatsapp || WHATSAPP}?text=${msg}`, "_blank");
    setCart([]); setAppliedCoupon(null); setCouponInput("");
    setTab("orders");
  };

  const openCheckout = () => {
    if (cartDetailed.length === 0) return;
    if (belowMin) { showToast(`Pedido mínimo do atacado: ${brl(wholesaleMin)}`); return; }
    setDelivery(d => ({
      ...d,
      customerName: d.customerName || user?.name || "",
      customerPhone: d.customerPhone || user?.phone || "",
      customerEmail: d.customerEmail || user?.email || "",
      recipientName: d.recipientName || user?.name || "",
      recipientPhone: d.recipientPhone || user?.phone || "",
    }));
    setCheckoutOpen(true);
  };

  const submitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartDetailed.length === 0 || mpLoading) return;
    setMpLoading(true);
    try {
      const res = await createCheckoutFn({
        data: {
          items: cartDetailed.map(i => ({
            name: i.product.name,
            qty: i.qty,
            price: i.product.price,
            image: /^https?:\/\//.test(i.product.image) ? i.product.image : undefined,
            productId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.product.id) ? i.product.id : undefined,
          })),
          couponCode: appliedCoupon?.code,
          discount: discount > 0 ? discount : undefined,
          cashbackAmount: useCashbackAmount > 0 ? useCashbackAmount : undefined,
          userId: userId ?? undefined,
          ...delivery,
        },

      }
      if (res.url) {
        setCheckoutOpen(false);
        window.location.assign(res.url);
      } else {
        showToast(res.error || "Erro ao iniciar pagamento");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao iniciar pagamento");
    } finally {
      setMpLoading(false);
    }
  };

  if (!ready) return <div className="min-h-screen bg-[#F4F4F6]" />;

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen pb-24 text-[#1A1A1A] bg-[#F4F4F6]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg animate-[slideDown_.3s_ease]">
          {toast}
        </div>
      )}

      {/* Drawer (estilo loja parceira) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[950] flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <aside className="relative h-full w-[86%] max-w-[360px] overflow-y-auto bg-[#2968c8] ring-1 ring-cyan-500/20">
            {/* Header com logo + Marketplace Oficial */}
            <div className="flex items-start gap-3 p-4">
              <img src={logo} alt="Grupo GF" className="h-14 w-14 shrink-0 rounded-lg bg-white/5 p-1 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold uppercase tracking-wide text-white">GRUPO GF</p>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-400">Rede Varejista</p>
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                  <BadgeCheck className="h-3 w-3" /> Marketplace Oficial
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Card usuário / visitante */}
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl bg-[#2968c8] p-3 ring-1 ring-cyan-500/15">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#2968c8] ring-1 ring-cyan-500/20 overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">
                  {user ? `Olá, ${user.name.split(" ")[0]}!` : "Olá, visitante!"}
                </p>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {user ? "Bem-vindo de volta" : "Faça login e aproveite as melhores ofertas"}
                </p>
              </div>
              {!user && (
                <button
                  onClick={() => { setDrawerOpen(false); navigate("/auth"); }}
                  className="rounded-lg px-3 py-2 text-xs font-bold text-white shadow-md"
                  style={{ background: "linear-gradient(135deg,#0a4fe3,#8b5cf6)" }}
                >
                  Entrar <ChevronRight className="inline h-3 w-3" />
                </button>
              )}
            </div>

            {/* Carteira GF */}
            <div 
              onClick={() => { setDrawerOpen(false); navigate("/carteira"); }}
              className="mx-4 mb-4 rounded-xl bg-[#2968c8] p-3 ring-1 ring-cyan-500/15 cursor-pointer hover:bg-[#1E56B1] transition-colors"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <Wallet className="h-4 w-4 text-cyan-400" /> Carteira GF
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-cyan-400">
                  Ver detalhes <ChevronRight className="h-3 w-3" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-slate-200">Saldo disponível</p>
                  <p className="font-bold text-emerald-400">R$ 0,00</p>
                </div>
                <div>
                  <p className="text-slate-200">Saldo pendente</p>
                  <p className="font-bold text-orange-400">R$ 0,00</p>
                </div>
                <div>
                  <p className="text-slate-200">Meu cashback</p>
                  <p className="font-bold text-violet-400">{brl(cashback.available || 0)}</p>
                </div>
              </div>
            </div>

            {/* Admin shortcut */}
            {isOwner && (
              <div className="mx-4 mb-3">
                <button
                  onClick={() => { setDrawerOpen(false); navigate("/admin/dashboard"); }}
                  className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 font-semibold text-white shadow-md"
                  style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}
                >
                  <Shield size={18} /> Administração
                </button>
              </div>
            )}

            {/* PRINCIPAL */}
            <p className="px-5 pb-1 text-[11px] font-bold tracking-wider text-slate-500">PRINCIPAL</p>
            <div className="px-2">
              {[
                { t: "home", label: "Início", icon: HomeIcon },
                { t: "categories", label: "Categorias", icon: Grid },
                { t: "cart", label: "Carrinho", icon: ShoppingCart, badge: cartCount },
                { t: "favorites", label: "Favoritos", icon: Heart, badge: user?.favorites.length || 0 },
                { t: "notifications", label: "Notificações", icon: Bell, badge: unreadNotifs },
                { t: "cashback", label: "Meu Cashback", icon: DollarSign },
                { t: "orders", label: "Minhas Compras", icon: Package },
                { t: "gmail", label: "Gmail Suporte", icon: Mail },
                { t: "profile", label: "Perfil", icon: User },
                { t: "faq", label: "FAQ", icon: HelpCircle },
              ].map((it: any) => {
                const active = tab === it.t;
                return (
                  <button
                    key={it.t}
                    onClick={() => { setTab(it.t as Tab); setDrawerOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                      active
                        ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                        : "text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <it.icon className={`h-5 w-5 ${active ? "text-cyan-400" : "text-slate-400"}`} />
                    <span className="flex-1 text-left font-medium">{it.label}</span>
                    {it.badge > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                        {it.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </button>
                );
              })}
            </div>

            {/* VENDA COM A GENTE */}
            <p className="mt-3 px-5 pb-1 text-[11px] font-bold tracking-wider text-slate-500">VENDA COM A GENTE</p>
            <div className="px-4 pb-2">
              {isPartner ? (
                <button
                  onClick={() => { setDrawerOpen(false); navigate({ to: "/parceiro" as any } }}
                  className="flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/40 hover:bg-emerald-500/15"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/20">
                    <Store className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-emerald-300">PARCEIRO GF ATIVADO</p>
                    <p className="text-[11px] text-slate-400">Acessar painel do parceiro</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-emerald-400" />
                </button>
              ) : (
                <button
                  onClick={handleActivatePartner}
                  disabled={partnerActivating}
                  className="flex w-full items-center gap-3 rounded-xl bg-cyan-500/10 p-3 ring-1 ring-cyan-500/40 hover:bg-cyan-500/15 disabled:opacity-60"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500/20">
                    <Store className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-cyan-300">
                      {partnerActivating ? "ATIVANDO..." : "TORNE-SE PARCEIRO GF"}
                    </p>
                    <p className="text-[11px] text-slate-400">Venda online e aumente seus ganhos</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-cyan-400" />
                </button>
              )}
            </div>

            {/* TODAS AS CATEGORIAS */}
            <p className="mt-3 px-5 pb-1 text-[11px] font-bold tracking-wider text-slate-500">TODAS AS CATEGORIAS</p>
            <div className="px-2 pb-4">
              {ALL_CATEGORIES.map((c) => {
                const subs = CATEGORIES_TREE[c] || [];
                const open = expandedCategory === c;
                const count = products.filter((p) => p.category === c).length;
                return (
                  <div key={c}>
                    <button
                      onClick={() => {
                        if (subs.length === 0) {
                          setActiveCategory(c); setSearch(""); setTab("home"); setDrawerOpen(false);
                        } else {
                          setExpandedCategory(open ? null : c);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-200 hover:bg-white/5"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-[#2968c8] ring-1 ring-cyan-500/15">
                        <Package className="h-4 w-4 text-slate-300" />
                      </div>
                      <span className="flex-1 text-left font-medium">{c}</span>
                      <span className="text-xs text-slate-400">{count}</span>
                      {subs.length > 0 ? (
                        open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                    </button>
                    {open && subs.length > 0 && (
                      <div className="ml-12 border-l border-cyan-500/15 pl-2">
                        <button
                          onClick={() => { setActiveCategory(c); setSearch(""); setTab("home"); setDrawerOpen(false); }}
                          className="block w-full rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
                        >
                          Tudo em {c}
                        </button>
                        {subs.map((s) => (
                          <button
                            key={s}
                            onClick={() => { setActiveCategory(c); setSearch(s); setTab("home"); setDrawerOpen(false); }}
                            className="block w-full rounded px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/5"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Logout + install */}
            <div className="px-2 pb-2 border-t border-white/5 pt-2">
              <button
                onClick={signOutToLogin}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-400 hover:bg-white/5"
              >
                <LogOut className="h-5 w-5" /> <span className="flex-1 text-left font-medium">Sair</span>
              </button>
              <div className="px-1 pt-2"><InstallAppButton /></div>
            </div>

            {/* Trust ribbon footer */}
            <div className="grid grid-cols-2 gap-3 border-t border-cyan-500/10 bg-[#2968c8]/80 p-4 text-[11px]">
              {[
                { icon: Truck, t: "Frete Grátis", s: "acima de R$199", c: "text-cyan-400" },
                { icon: ShieldCheck, t: "Compra Segura", s: "ambiente protegido", c: "text-emerald-400" },
                { icon: Tag, t: "Parcelamento", s: "em até 6x", c: "text-violet-400" },
                { icon: Headphones, t: "Suporte 24h", s: "atendimento rápido", c: "text-amber-400" },
              ].map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <it.icon className={`h-4 w-4 ${it.c}`} />
                  <div className="leading-tight">
                    <p className="font-semibold text-slate-200">{it.t}</p>
                    <p className="text-slate-400">{it.s}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* Header premium navy + gold - Inspired by Mercado Livre layout */}
      <header className="sticky top-0 z-50 shadow-md bg-[#0A192F] text-white">
        {/* DESKTOP HEADER (Visible on md and larger) */}
        <div className="hidden md:block">
          {/* Top Row: Logo, Search, Promo Slogan */}
          <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-6">
            {/* Logo area */}
            <button 
              onClick={() => { setSearch(""); setActiveCategory("Todas"); setTab("home"); }} 
              className="flex items-center gap-2.5 shrink-0 transition-transform active:scale-95"
            >
              <img src={logo} alt="Grupo GF" className="h-10 w-10 object-contain" />
              <div className="text-left">
                <span className="block font-extrabold tracking-wider text-sm uppercase leading-none text-white">
                  GRUPO GF
                </span>
                <span className="block text-[9px] tracking-widest uppercase font-semibold text-amber-400 mt-0.5">
                  MARKETPLACE
                </span>
              </div>
            </button>

            {/* Mercado Livre Style Search Bar */}
            <div className="flex-1 max-w-2xl relative">
              {tab === "home" && (
                <div className="relative flex items-center bg-white rounded shadow-sm border border-slate-200">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar produtos, marcas e muito mais no Grupo GF..."
                    className="w-full bg-transparent py-2.5 pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
                    onKeyDown={(e) => { if (e.key === "Enter") setTab("home"); }}
                  />
                  <button 
                    onClick={() => setTab("home")}
                    className="absolute right-0 top-0 bottom-0 px-4 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors border-l border-slate-100 cursor-pointer"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Premium Promo Banner Slogan */}
            <div 
              onClick={() => setTab("faq")}
              className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors shrink-0 bg-white/5 px-3 py-1.5 rounded-full border border-white/5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>Assine o <span className="text-amber-400 font-bold">GF Prime</span> e ganhe Frete Grátis!</span>
            </div>
          </div>

          {/* Bottom Row: Address Pin, Central Nav, Right Quick Actions */}
          <div className="border-t border-white/5 bg-[#071324] text-xs py-2">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-4">
              
              {/* Address selector (Left) */}
              <div 
                className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none transition-colors max-w-[250px]" 
                onClick={() => {
                  if (user) {
                    setOpenAddressesGlobal(true);
                  } else {
                    navigate("/auth");
                  }
                }}
                title={defaultAddress ? `${defaultAddress.street}, ${defaultAddress.number} - ${defaultAddress.neighborhood}, ${defaultAddress.city}/${defaultAddress.state}` : "Selecionar endereço"}
              >
                <MapPin className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                <div className="flex flex-col text-left leading-tight min-w-0 flex-1">
                  <span className="text-[9px] text-slate-400 font-medium">Enviar para</span>
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {addressText}
                  </span>
                </div>
              </div>

              {/* Navigation links (Center) */}
              <nav className="flex items-center gap-5 text-slate-300 font-medium">
                <button 
                  onClick={() => setTab("categories")} 
                  className={`flex items-center gap-1 hover:text-white transition-colors py-1 ${tab === "categories" ? "text-amber-400 font-bold" : ""}`}
                >
                  Categorias <ChevronDown size={14} className="text-slate-400" />
                </button>
                <button 
                  onClick={() => { setActiveCategory("Todas"); setSearch(""); setSortBy("discount"); setTab("home"); }} 
                  className={`hover:text-white transition-colors py-1 ${tab === "home" && sortBy === "discount" ? "text-amber-400 font-bold" : ""}`}
                >
                  Ofertas do Dia
                </button>
                <button 
                  onClick={() => { setActiveCategory("Todas"); setSearch(""); setSortBy("relevance"); setTab("home"); }} 
                  className={`hover:text-white transition-colors py-1 ${tab === "home" && !search && sortBy === "relevance" ? "text-amber-400 font-bold" : ""}`}
                >
                  Início
                </button>
                <button 
                  onClick={() => setTab("orders")} 
                  className={`hover:text-white transition-colors py-1 ${tab === "orders" ? "text-amber-400 font-bold" : ""}`}
                >
                  Meus Pedidos
                </button>
                {isPartner ? (
                  <button 
                    onClick={() => navigate("/parceiro")} 
                    className="hover:text-white transition-colors text-emerald-400 font-bold flex items-center gap-1 py-1"
                  >
                    <Store size={13} /> Painel do Parceiro
                  </button>
                ) : (
                  <button 
                    onClick={handleActivatePartner} 
                    className="hover:text-white transition-colors text-amber-400 font-bold flex items-center gap-1 py-1"
                  >
                    <Store size={13} /> Seja Parceiro
                  </button>
                )}
                <button 
                  onClick={() => setTab("faq")} 
                  className={`hover:text-white transition-colors py-1 ${tab === "faq" ? "text-amber-400 font-bold" : ""}`}
                >
                  Contato / Ajuda
                </button>
                <button 
                  onClick={() => setTab("gmail")} 
                  className={`hover:text-white transition-colors py-1 ${tab === "gmail" ? "text-amber-400 font-bold" : ""}`}
                >
                  Gmail Suporte
                </button>
              </nav>

              {/* Account, Favorites, Cart & Notifications (Right) */}
              <div className="flex items-center gap-5 text-slate-300 font-medium shrink-0">
                {user ? (
                  <button 
                    onClick={() => setTab("profile")} 
                    className="hover:text-white flex items-center gap-1.5 transition-colors py-1"
                  >
                    <User size={14} className="text-slate-400" />
                    <span>Olá, {user.name.split(" ")[0]}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-slate-400">
                    <Link to="/auth" className="text-slate-300 hover:text-white transition-colors">Crie a sua conta</Link>
                    <span>/</span>
                    <Link to="/auth" className="text-slate-300 hover:text-white transition-colors">Entre</Link>
                  </div>
                )}

                <button 
                  onClick={() => setTab("favorites")} 
                  className="relative hover:text-white transition-colors flex items-center gap-1 py-1"
                  title="Meus Favoritos"
                >
                  <Heart size={14} className="text-slate-400" />
                  <span className="hidden lg:inline">Favoritos</span>
                  {user?.favorites && user.favorites.length > 0 && (
                    <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-slate-900 leading-none">
                      {user.favorites.length}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => setTab("notifications")} 
                  className="relative hover:text-white transition-colors py-1" 
                  title="Notificações"
                >
                  <Bell size={15} className="text-slate-400" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white leading-none">
                      {unreadNotifs}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => setTab("cart")} 
                  className="relative hover:text-white transition-colors flex items-center gap-1.5 py-1" 
                  title="Meu Carrinho"
                >
                  <ShoppingCart size={15} className="text-slate-400" />
                  <span className="hidden lg:inline">Carrinho</span>
                  {cartCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-slate-900 leading-none">
                      {cartCount}
                    </span>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* MOBILE HEADER (Visible on screen < md) */}
        <div className="md:hidden">
          {/* Row 1: Profile Photo, Search Bar, Actions */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {/* User Profile Picture button on the left instead of Logo & Hamburger */}
            <button 
              onClick={() => {
                if (user) {
                  setTab("profile");
                } else {
                  navigate("/auth");
                }
              }}
              className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 shrink-0 select-none active:scale-95 transition-transform bg-slate-800 flex items-center justify-center"
              title={user ? "Ver perfil" : "Entrar / Cadastrar"}
            >
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || "Cliente")}&backgroundColor=06b6d4`} 
                alt="Perfil" 
                className="w-full h-full object-cover" 
              />
            </button>

            {/* Search Bar in the middle (taking up space) */}
            <div className="flex-1 relative">
              {tab === "home" ? (
                <div className="relative flex items-center bg-white rounded shadow-sm">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar no Grupo GF..."
                    className="w-full bg-transparent py-2 pl-3 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
                    onKeyDown={(e) => { if (e.key === "Enter") setTab("home"); }}
                  />
                  <button 
                    onClick={() => setTab("home")}
                    className="absolute right-0 top-0 bottom-0 px-2.5 flex items-center justify-center text-slate-400 hover:text-amber-500 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="font-extrabold tracking-wider text-sm uppercase leading-none text-white">
                    GRUPO GF
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions (Right side) */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setTab("favorites")} className="relative rounded-md p-1.5 text-slate-300 hover:text-white">
                <Heart className="h-5 w-5" />
                {user?.favorites && user.favorites.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-slate-900 leading-none">
                    {user.favorites.length}
                  </span>
                )}
              </button>
              
              <button onClick={() => setTab("notifications")} className="relative rounded-md p-1.5 text-slate-300 hover:text-white">
                <Bell className="h-5 w-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white leading-none">
                    {unreadNotifs}
                  </span>
                )}
              </button>

              <button onClick={() => setTab("cart")} className="relative rounded-md p-1.5 text-slate-300 hover:text-white">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-slate-900 leading-none">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Postal Code / Delivery Info */}
          <div 
            className="border-t border-white/5 bg-[#071324] px-4 py-2 flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer" 
            onClick={() => {
              if (user) {
                setOpenAddressesGlobal(true);
              } else {
                navigate("/auth");
              }
            }}
          >
            <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {defaultAddress 
                ? `Enviar para ${defaultAddress.recipient || user?.name || "mim"} - ${defaultAddress.street}, ${defaultAddress.number}, ${defaultAddress.neighborhood}, ${defaultAddress.city}/${defaultAddress.state}`
                : (user ? `Enviar para ${user.name} - ${user.email}` : "Informe seu endereço de entrega")}
            </span>
          </div>
        </div>
      </header>

      {tab === "servicos" && <ServicosTab />}
      {tab === "mercado" && <MercadoTab />}

      {tab === "home" && (
        <div className="bg-[#F4F4F6] text-slate-900 min-h-screen">
          {/* Banner Carousel Section */}
          <div className="w-full mb-6">
            <BannerCarousel banners={banners} />
          </div>

          {/* Seção do Histórico de Navegação: Inspirado no último que você viu */}
          {lastViewedProduct && (
            <div className="max-w-7xl mx-auto px-4 mt-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                    <h3 className="font-bold text-sm text-slate-800">Inspirado no último que você viu</h3>
                  </div>
                  <button onClick={() => { setLastViewedId(null); localStorage.removeItem("gf_last_viewed"); }} className="text-xs text-slate-400 hover:text-slate-600">
                    Limpar histórico
                  </button>
                </div>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setProductModal(lastViewedProduct)}>
                  <img src={lastViewedProduct.image} alt={lastViewedProduct.name} className="w-16 h-16 rounded-lg object-cover border border-slate-100" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-slate-500 uppercase tracking-wider truncate">{lastViewedProduct.category}</p>
                    <h4 className="font-bold text-sm text-slate-800 truncate leading-snug">{lastViewedProduct.name}</h4>
                    <p className="text-sm font-extrabold text-[#1E3A8A] mt-0.5">{brl(lastViewedProduct.price)}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </div>
            </div>
          )}

          {/* Menu de Atalhos Principais Grupo GF */}
          <div className="bg-white py-6 border-y border-slate-200/60 mt-4">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-4 md:gap-8 overflow-x-auto pb-2 scrollbar-none justify-between md:justify-center">
                {[
                  {
                    id: "servicos",
                    label: "Serviços",
                    icon: Wrench,
                    bgColor: "bg-blue-50 text-[#1E3A8A] border-blue-100 hover:bg-blue-100/80",
                    onClick: () => setTab("servicos")
                  },
                  {
                    id: "mercado",
                    label: "Supermercados",
                    icon: ShoppingBag,
                    bgColor: "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100/80",
                    onClick: () => setTab("mercado")
                  },
                  {
                    id: "promocao",
                    label: "Promoção",
                    icon: Percent,
                    bgColor: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/80",
                    onClick: () => {
                      setActiveCategory("Todas");
                      setSortBy("discount");
                      setSearch("");
                      setTab("home");
                      setTimeout(() => {
                        document.getElementById("vitrine")?.scrollIntoView({ behavior: "smooth", block: "start" }
                      }, 100);
                    }
                  },
                  {
                    id: "carteira",
                    label: "Carteira GF",
                    icon: Wallet,
                    bgColor: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/80",
                    onClick: () => {
                      navigate("/carteira");
                    }
                  },
                  {
                    id: "parceiros",
                    label: "Parceiros da GF",
                    icon: Handshake,
                    bgColor: "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100/80",
                    onClick: () => {
                      document.getElementById("lojas-parceiras")?.scrollIntoView({ behavior: "smooth", block: "start" }
                    }
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className="flex flex-col items-center gap-2 group shrink-0 text-center w-24 cursor-pointer"
                  >
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center border shadow-sm transition-all duration-300 group-hover:scale-105 ${item.bgColor}`}>
                      <item.icon className="h-6 w-6 transition-transform group-hover:rotate-6" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-[#1E3A8A] transition-colors leading-tight">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Premium Loyalty Offer Callout */}
          <div className="max-w-7xl mx-auto px-4 mt-6">
            <Link to="/indique-e-ganhe" className="block rounded-2xl overflow-hidden relative border border-amber-500/20 shadow-sm" style={{ background: "linear-gradient(135deg,#0A192F 0%,#071324 70%,#1E3A8A 100%)" }}>
              <div className="relative p-5 pr-28">
                <span className="inline-block bg-amber-500/25 text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider mb-2">Clube de Vantagens</span>
                <h3 className="text-white text-xl font-black leading-tight tracking-tight">GF+ Premium Club</h3>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-300 leading-snug">Ganhe cupons especiais de desconto e frete grátis em suas compras!</p>
                <span className="mt-4 inline-block rounded-md px-4 py-1.5 text-xs font-black tracking-wider text-slate-900 bg-amber-400 hover:bg-amber-500 shadow-md">ENTRAR PARA O CLUBE</span>
              </div>
            </Link>
          </div>

          {/* Install App and Become Partner Callout Row */}
          <div className="max-w-7xl mx-auto px-4 mt-4 flex gap-3">
            <div className="flex-1 min-w-0"><InstallAppButton /></div>
            <button onClick={handleActivatePartner} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#1E3A8A] hover:bg-[#0A192F] shadow-sm hover:opacity-95 whitespace-nowrap transition-all">
              <Store size={14} className="text-amber-400" /> Vender no Grupo GF
            </button>
          </div>

          {/* Products Header Section */}
          <div id="vitrine" className="max-w-7xl mx-auto px-4 mt-8 scroll-mt-20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Ofertas do Dia</h2>
                <p className="text-xs text-slate-500">Os melhores descontos do Marketplace oficial do Grupo GF</p>
              </div>
              <button onClick={() => setShowFilters(v => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 flex items-center gap-1.5 font-semibold shadow-sm">
                <Settings size={13} className="text-slate-500" /> Filtros {((maxPrice > 0 ? 1 : 0) + (sortBy !== "relevance" ? 1 : 0) + (filterEstado ? 1 : 0) + (filterCidade ? 1 : 0) + (filterRegiao ? 1 : 0) + (filterBairro ? 1 : 0)) > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] font-bold px-1 rounded-full flex items-center justify-center">!</span>}
              </button>
            </div>

            {/* Scrollable Horizontal Subcategory list or Top bar filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    setActiveCategory(c);
                    setSearch("");
                  }}
                  className={`px-4 py-2 rounded-full text-xs whitespace-nowrap border font-bold transition-all ${
                    activeCategory === c
                      ? "bg-[#0A192F] border-[#0A192F] text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <LojasParceirasStrip partners={partners} />


          {showFilters && (
            <div className="max-w-7xl mx-auto px-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200/80 mb-6 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ordenar por</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "relevance", l: "Relevância" },
                      { v: "price-asc", l: "Menor preço" },
                      { v: "price-desc", l: "Maior preço" },
                      { v: "discount", l: "Maior desconto" },
                      { v: "name", l: "A-Z" },
                    ].map(o => (
                      <button key={o.v} onClick={() => setSortBy(o.v as typeof sortBy)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          sortBy === o.v 
                            ? "bg-[#0A192F] text-white border-[#0A192F] font-bold shadow-sm" 
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}>{o.l}</button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preço máximo</p>
                    <span className="text-sm text-[#1E3A8A] font-black">{maxPrice > 0 ? brl(maxPrice) : "Sem limite"}</span>
                  </div>
                  <input type="range" min={0} max={Math.ceil(priceCeiling)} step={5} value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E3A8A]" />
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Filtrar por Localização (Estados, Cidades, Bairros...)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Estado (UF)</label>
                      <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#0A192F]">
                        <option value="">Todos os Estados</option>
                        {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cidade</label>
                      <input type="text" placeholder="Filtrar por Cidade" value={filterCidade} onChange={e => setFilterCidade(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0A192F]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Região</label>
                      <input type="text" placeholder="Filtrar por Região" value={filterRegiao} onChange={e => setFilterRegiao(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0A192F]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Bairro</label>
                      <input type="text" placeholder="Filtrar por Bairro" value={filterBairro} onChange={e => setFilterBairro(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#0A192F]" />
                    </div>
                  </div>
                </div>

                {(maxPrice > 0 || sortBy !== "relevance" || activeCategory !== "Todas" || search || filterEstado || filterCidade || filterRegiao || filterBairro) && (
                  <div className="pt-2 border-t border-slate-100">
                    <button onClick={() => { setMaxPrice(0); setSortBy("relevance"); setActiveCategory("Todas"); setSearch(""); setFilterEstado(""); setFilterCidade(""); setFilterRegiao(""); setFilterBairro(""); }}
                      className="text-xs text-red-500 hover:text-red-700 font-bold underline cursor-pointer">
                      Limpar todos os filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Listing Section */}
          <div className="max-w-7xl mx-auto px-4 mt-2">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/60">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Destaques para você</h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl py-12 text-center border border-slate-200/80 shadow-sm">
                <p className="text-sm text-slate-400">Nenhum produto ou serviço encontrado com os filtros selecionados.</p>
                <button onClick={() => { setMaxPrice(0); setSortBy("relevance"); setActiveCategory("Todas"); setSearch(""); setFilterEstado(""); setFilterCidade(""); setFilterRegiao(""); setFilterBairro(""); }}
                  className="mt-3 text-xs text-[#1E3A8A] font-bold underline">Limpar filtros</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {filtered.map(p => (
                  <ProductCard 
                    key={p.id} 
                    product={p} 
                    onOpen={() => {
                      setProductModal(p);
                      setLastViewedId(p.id);
                      localStorage.setItem("gf_last_viewed", p.id);
                    }} 
                    onAdd={() => addToCart(p.id)}
                    isFav={user?.favorites.includes(p.id) ?? false} 
                    onFav={() => toggleFavorite(p.id)} 
                    onCategoryClick={(cat) => {
                      setActiveCategory(cat);
                      setSearch("");
                      setTab("home");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES */}
      {tab === "categories" && (
        <div className="fixed inset-0 top-0 bottom-[56px] z-40 bg-white flex flex-col md:relative md:inset-auto md:h-[650px] md:rounded-2xl md:shadow-lg md:overflow-hidden md:border md:border-slate-200/80 md:my-6 md:mx-auto md:max-w-4xl">
          {/* Yellow native header (mobile only) */}
          <div className="bg-amber-400 text-slate-800 px-4 py-3.5 flex items-center gap-3 shrink-0 md:hidden shadow-sm">
            <button onClick={() => setTab("home")} className="p-1 -ml-1 hover:bg-black/5 rounded-full transition-colors">
              <ArrowLeft size={20} className="text-slate-800" />
            </button>
            <span className="font-extrabold text-base tracking-wide">Categorias</span>
          </div>

          {/* Header for desktop only */}
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <div>
              <h2 className="font-extrabold text-lg text-slate-800">Todas as Categorias</h2>
              <p className="text-xs text-slate-400">Navegue pelas categorias e encontre tudo o que precisa</p>
            </div>
          </div>

          {/* Split View Container */}
          <div className="flex-1 min-h-0 flex bg-white">
            {/* Left Sidebar: Main Categories */}
            <div className="w-[105px] md:w-56 bg-[#F4F4F6] overflow-y-auto shrink-0 border-r border-slate-100 select-none pb-4 scrollbar-thin">
              {ALL_CATEGORIES.map(c => {
                const isSelected = selectedSidebarCategory === c;
                return (
                  <button
                    key={c}
                    onClick={() => setSelectedSidebarCategory(c)}
                    className={`w-full py-3 px-3.5 text-left text-[11px] md:text-sm transition-all duration-200 relative flex items-center leading-tight min-h-[56px] md:min-h-[64px] border-b border-slate-200/30 ${
                      isSelected 
                        ? "bg-white font-bold text-[#2968c8]" 
                        : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900 font-medium"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#2968c8] rounded-r-md" />
                    )}
                    <span className="hyphens-auto break-words">{c}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Content Area: Subcategories */}
            <div className="flex-1 overflow-y-auto bg-white p-4 md:p-6 pb-20 scrollbar-thin">
              <div className="mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                  {selectedSidebarCategory}
                </h3>
                <button 
                  onClick={() => { setActiveCategory(selectedSidebarCategory); setSearch(""); setTab("home"); }}
                  className="text-[11px] text-[#2968c8] font-bold hover:underline"
                >
                  Ver todos
                </button>
              </div>

              {/* Subcategory Grid */}
              {(() => {
                const subs = CATEGORIES_TREE[selectedSidebarCategory] || [];
                if (subs.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                      <Package size={36} className="opacity-40 mb-2" />
                      <p className="text-xs">Nenhuma subcategoria disponível</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-3 gap-y-5 gap-x-2.5">
                    {subs.map(s => {
                      const imgUrl = getSubcategoryImage(selectedSidebarCategory, s, products);
                      const isUnsplash = imgUrl.includes("unsplash.com");
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setActiveCategory(selectedSidebarCategory);
                            setSearch(s);
                            setTab("home");
                          }}
                          className="flex flex-col items-center group transition-transform active:scale-95 text-center"
                        >
                          {/* Image Circle */}
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm group-hover:border-slate-200 group-hover:shadow transition-all relative">
                            <img
                              src={imgUrl}
                              alt={s}
                              className={`${isUnsplash ? "w-full h-full object-cover" : "w-4/5 h-4/5 object-contain"} transition-transform group-hover:scale-105`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = logo;
                              }}
                            />
                          </div>
                          {/* Label */}
                          <span className="mt-1.5 text-[9px] md:text-xs font-medium text-slate-700 leading-tight group-hover:text-[#2968c8] group-hover:font-semibold transition-colors line-clamp-2 break-words max-w-[64px] sm:max-w-[72px] md:max-w-[88px]">
                            {s}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}



      {/* CART */}
      {tab === "cart" && (
        <div className="px-4 pt-4">
          <h2 className="font-bold text-xl mb-4">Carrinho</h2>
          {cartDetailed.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingCart size={48} className="mx-auto mb-3 opacity-40" />
              <p>Seu carrinho está vazio.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4">
                {cartDetailed.map(i => (
                  <div key={i.product.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3 flex gap-3">
                    <img src={i.product.image} alt="" className="w-16 h-16 rounded-lg object-cover" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{i.product.name}</p>
                      <p className="text-cyan-400 font-bold text-sm">{brl(i.product.price)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => changeQty(i.product.id, -1)} className="w-7 h-7 rounded bg-[#2968c8] flex items-center justify-center"><Minus size={14} /></button>
                        <span className="text-sm w-6 text-center">{i.qty}</span>
                        <button onClick={() => changeQty(i.product.id, 1)} className="w-7 h-7 rounded bg-[#2968c8] flex items-center justify-center"><Plus size={14} /></button>
                        <button onClick={() => removeFromCart(i.product.id)} className="ml-auto text-red-400 p-1"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-3">
                <input value={couponInput} onChange={e => setCouponInput(e.target.value)}
                  className="flex-1 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                  placeholder="Código do cupom" />
                <button onClick={applyCoupon} className="px-4 py-2 text-sm rounded-lg font-semibold text-white"
                  style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>Aplicar</button>
              </div>

              {/* Cashback toggle */}
              {cashback.available > 0 && (
                <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Gift size={18} className="text-cyan-300" />
                      <div>
                        <p className="text-sm font-semibold text-cyan-200">Usar meu cashback</p>
                        <p className="text-[11px] text-cyan-300/80">Saldo: {brl(cashback.available)} · até {brl(maxCashbackUsable)} neste pedido</p>
                      </div>
                    </div>
                    <label className="relative inline-block w-10 h-6">
                      <input type="checkbox" className="opacity-0 w-0 h-0 peer"
                        checked={useCashbackAmount > 0}
                        onChange={e => setUseCashbackAmount(e.target.checked ? maxCashbackUsable : 0)} />
                      <span className="absolute inset-0 bg-slate-600 rounded-full peer-checked:bg-cyan-500 transition" />
                      <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-4" />
                    </label>
                  </div>
                  {useCashbackAmount > 0 && (
                    <p className="text-[11px] text-cyan-300/80">
                      <Calendar size={11} className="inline -mt-0.5" /> Lembre-se: cashback tem validade de 30 dias e só pode ser usado em compras.
                    </p>
                  )}
                </div>
              )}

              <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4 mb-3">
                <div className="flex justify-between text-sm mb-2"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm mb-2 text-green-400">
                    <span>Desconto ({appliedCoupon.code})</span><span>-{brl(discount)}</span>
                  </div>
                )}
                {cashbackApplied > 0 && (
                  <div className="flex justify-between text-sm mb-2 text-cyan-300">
                    <span>Cashback usado</span><span>-{brl(cashbackApplied)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-2">
                  <span>Total</span><span>{brl(total)}</span>
                </div>
              </div>


              {belowMin && (
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 mb-3 text-amber-200 text-sm">
                  <p className="font-semibold mb-1">Pedido mínimo do atacado: {brl(wholesaleMin)}</p>
                  <p className="text-xs">Faltam <strong>{brl(wholesaleMin - subtotal)}</strong> para liberar a finalização.</p>
                </div>
              )}

              <div className="space-y-2">
                <button onClick={openCheckout} disabled={mpLoading || belowMin}
                  className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#00b1ea,#3483FA)" }}>
                  <CreditCard size={18} /> Finalizar Compra (Cartão, Pix, Boleto)
                </button>
                <button onClick={() => checkout("whatsapp")} disabled={belowMin}
                  className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#25D366,#128C7E)" }}>
                  <MessageCircle size={18} /> Finalizar pelo WhatsApp
                </button>
                <button onClick={() => checkout("pickup")} disabled={belowMin}
                  className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
                  <Phone size={18} /> Reservar e Retirar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ORDERS */}
      {tab === "orders" && (
        <div className="px-4 pt-4">
          <h2 className="font-bold text-xl mb-4">Meus Pedidos</h2>
          {remoteOrders.length === 0 && orders.length === 0 ? (
            <p className="text-center text-sm py-8 text-slate-400">Nenhum pedido ainda.</p>
          ) : (
            <div className="space-y-3">
              {remoteOrders.map((o: any) => <RemoteOrderCard key={o.id} order={o} />)}
              {orders.map(o => <LocalOrderCard key={o.id} order={o} />)}
            </div>
          )}
        </div>
      )}

      {/* PROFILE */}
      {tab === "profile" && user && (
        <ProfileTab
          user={user} setUser={setUser} orders={orders} products={products}
          remoteOrders={remoteOrders}
          onOpenProduct={p => setProductModal(p)}
          onGoOrders={() => setTab("orders")}
          onGoFaq={() => setTab("faq")}
          onGoGmail={() => setTab("gmail")}
          onGoFavorites={() => setTab("favorites")}
          onGoCashback={() => setTab("cashback")}
          onGoNotifications={() => setTab("notifications")}
          cashbackAvailable={cashback.available}
          unreadNotifs={unreadNotifs}
          showToast={showToast}
          isOwner={isOwner}
          onGoAdmin={() => navigate("/admin/dashboard")}
          onSignOut={signOutToLogin}
          onOpenAddresses={() => setOpenAddressesGlobal(true)}
        />
      )}

      {/* FAVORITES */}
      {tab === "favorites" && user && (
        <FavoritesTab user={user} products={products} onOpen={p => setProductModal(p)} onToggle={id => toggleFavorite(id)} />
      )}

      {/* NOTIFICATIONS */}
      {tab === "notifications" && (
        <NotificationsTab
          items={notifs}
          onMarkRead={async (id) => { try { await markNotifRead({ data: { id } } refreshNotifs(); } catch {} }}
          onMarkAll={async () => { try { await markNotifRead({ data: { all: true } } refreshNotifs(); } catch {} }}
        />
      )}

      {/* CASHBACK */}
      {tab === "cashback" && (
        <CashbackTab data={cashback} onGoCart={() => setTab("cart")} />
      )}


      {/* GMAIL */}
      {tab === "gmail" && (
        <GmailSupportTab onGoBack={() => setTab("home")} />
      )}


      {/* FAQ */}
      {tab === "faq" && (
        <div className="px-4 pt-4">
          <h2 className="font-bold text-xl mb-4">Perguntas Frequentes</h2>
          <div className="space-y-3">
            {[
              ["Como faço um pedido?", "Adicione os produtos ao carrinho, escolha o endereço de entrega e finalize o pagamento pelo Mercado Pago (Pix, cartão ou boleto)."],
              ["Quais formas de pagamento são aceitas?", "Aceitamos Pix, cartão de crédito, cartão de débito e boleto bancário, tudo pelo Mercado Pago. Também dinheiro na entrega em alguns bairros."],
              ["Qual o prazo de entrega?", "Atendemos todo o Brasil. O prazo varia conforme a região: capitais e grandes centros em 1 a 3 dias úteis, demais cidades em 3 a 7 dias úteis após a confirmação do pagamento."],
              ["Qual o valor do frete?", "O frete é calculado conforme o bairro/cidade no momento do checkout. Pedidos acima do valor mínimo podem ter frete grátis em promoções."],
              ["Posso retirar na loja?", "Sim! Você pode escolher retirar na loja física do Grupo GF sem custo adicional. Avisaremos quando o pedido estiver pronto."],
              ["Como acompanho meu pedido?", "Vá em 'Pedidos' no menu inferior para ver o status: Pendente, Pago, Em preparo, Enviado ou Entregue."],
              ["Posso trocar ou devolver um produto?", "Sim, você tem até 7 dias após o recebimento para solicitar troca ou devolução, conforme o CDC. O produto deve estar na embalagem original."],
              ["Como uso um cupom de desconto?", "Insira o código do cupom no carrinho antes de finalizar. Experimente BEMVINDO10 para 10% OFF na primeira compra."],
              ["Como avaliar um produto?", "Após receber seu pedido (status 'Entregue'), abra o produto e deixe sua avaliação com nota, comentário e fotos."],
              ["Esqueci minha senha, o que fazer?", "Na tela de login, clique em 'Esqueci minha senha' e siga as instruções enviadas para seu e-mail."],
              ["Como altero meus dados cadastrais?", "Vá em 'Perfil' e toque em 'Informações do seu perfil' ou em 'Segurança' para alterar nome, telefone, e-mail, senha e foto."],
              ["Como cadastro um endereço de entrega?", "Em 'Perfil' → 'Endereços', toque em 'Adicionar novo endereço'. Você pode salvar quantos quiser e definir um como padrão."],
              ["Como altero ou removo um endereço?", "Em 'Perfil' → 'Endereços', toque em 'Editar' no endereço desejado, ou em 'Excluir' para removê-lo da sua lista."],
              ["Como troco minha foto de perfil?", "No 'Perfil', toque no ícone de câmera sobre a foto, ou vá em 'Segurança' → 'Alterar foto'."],
              ["Como excluo minha conta?", "Em 'Perfil', vá até 'Excluir conta', confirme digitando EXCLUIR. Esta ação é permanente e remove seus dados locais."],
              ["O atendimento é por WhatsApp?", `Sim! Fale com a gente pelo WhatsApp ${settings.whatsapp}. Atendimento de segunda a sábado, das 8h às 18h.`],
              ["Os produtos têm garantia?", "Eletrônicos e eletrodomésticos têm garantia do fabricante. Demais produtos seguem as condições padrão do CDC."],
              ["Vocês entregam em todo o Brasil?", "Sim! Atendemos todo o território nacional, do Oiapoque ao Chuí, com envio para qualquer CEP do Brasil."],
              ["Posso pedir produtos que não aparecem no app?", "Sim! Fale com a gente pelo WhatsApp informando o produto. Se tivermos em estoque, fazemos a inclusão para você."],
              ["Como funciona o pagamento na entrega?", "Em alguns bairros aceitamos pagamento no momento da entrega (dinheiro, Pix ou maquininha). Confirme a disponibilidade no checkout."],
              ["O app cobra alguma taxa?", "Não. O uso do app é gratuito. Você paga apenas pelos produtos e, quando houver, pelo frete da sua região."],
              ["Meus dados estão seguros?", "Sim. Usamos criptografia, pagamentos processados pelo Mercado Pago e não armazenamos dados de cartão. Seguimos a LGPD."],
              ["Como recebo novidades e promoções?", "Ative as notificações do app e siga o Grupo GF nas redes sociais. Também enviamos ofertas pelo WhatsApp para clientes cadastrados."],
              ["Posso ter mais de um endereço cadastrado?", "Sim! Salve quantos endereços quiser (casa, trabalho, casa dos pais) e escolha qual usar a cada compra."],
              ["Como cancelo um pedido?", "Enquanto o status estiver 'Pendente' ou 'Pago', fale com a gente pelo WhatsApp para solicitar o cancelamento e o estorno."],
            ].map(([q, a]) => (
              <details key={q} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4 group">
                <summary className="font-semibold text-sm cursor-pointer flex items-center justify-between gap-2 list-none">
                  <span>{q}</span>
                  <Plus size={16} className="text-cyan-400 group-open:rotate-45 transition-transform shrink-0" />
                </summary>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN */}
      {tab === "admin" && isOwner && (
        <AdminPanel
          products={products} setProducts={setProducts}
          banners={banners} setBanners={setBanners}
          coupons={coupons} setCoupons={setCoupons}
          orders={orders} setOrders={setOrders}
          settings={settings} setSettings={setSettings}
          editingProduct={editingProduct} setEditingProduct={setEditingProduct}
          showToast={showToast}
        />
      )}

      {/* Footer */}
      <footer className="px-4 py-6 border-t border-cyan-500/10 mb-16 mt-6 text-slate-300">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Sobre a loja */}
          <div>
            <h3 className="font-bold text-sm text-cyan-400 mb-1.5 flex items-center gap-1.5">
              <Star size={14} /> Sobre a loja
            </h3>
            <p className="text-xs leading-relaxed text-slate-400">
              O <span className="text-slate-200 font-semibold">Grupo GF Rede Varejista</span> nasceu de um sonho de
              família: <span className="text-slate-200">atender o Brasil inteiro com qualidade, economia e
              atendimento humano</span>. Começamos pequenos, com muito esforço e atenção a cada cliente, e hoje
              somos uma plataforma que conecta milhares de famílias a lojas parceiras em <span className="text-slate-200">todo o território nacional</span>.
              Entregamos em qualquer CEP do Brasil, com cashback, pagamento seguro pelo Mercado Pago e suporte por WhatsApp.
            </p>

          </div>

          {/* FAQs rápidas */}
          <div>
            <h3 className="font-bold text-sm text-cyan-400 mb-1.5 flex items-center gap-1.5">
              <HelpCircle size={14} /> Perguntas frequentes
            </h3>
            <div className="space-y-1.5">
              {[
                ["Como faço um pedido?", "Adicione ao carrinho, escolha o endereço e pague pelo Mercado Pago (Pix, cartão ou boleto)."],
                ["Qual o prazo de entrega?", "Atendemos todo o Brasil. 1 a 3 dias úteis para capitais e 3 a 7 dias úteis para demais cidades."],
                ["Posso retirar na loja?", "Sim, sem custo adicional. Avisamos quando o pedido estiver pronto."],
                ["Como vira parceiro?", "Toque em 'Seja um Parceiro GF' e envie seu cadastro para análise."],
              ].map(([q, a]) => (
                <details key={q} className="bg-[#2968c8] border border-cyan-500/10 rounded-lg px-3 py-2 group">
                  <summary className="text-xs font-semibold cursor-pointer flex items-center justify-between gap-2 list-none">
                    <span>{q}</span>
                    <Plus size={12} className="text-cyan-400 group-open:rotate-45 transition-transform shrink-0" />
                  </summary>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{a}</p>
                </details>
              ))}
              <button onClick={() => setTab("faq")} className="text-[11px] text-cyan-300 underline mt-1">
                Ver todas as perguntas
              </button>
            </div>
          </div>

          {/* Seja parceiro CTA */}
          <Link
            to="/seja-um-parceiro"
            className="flex items-center justify-between gap-2 rounded-lg border border-orange-500/30 px-3 py-2.5 hover:border-orange-400 transition"
            style={{ background: "linear-gradient(135deg,rgba(10,79,227,.15),rgba(255,106,0,.15))" }}
          >
            <span className="flex items-center gap-2 text-xs">
              <Store size={14} className="text-orange-300" />
              <span className="font-semibold text-slate-100">Quer vender no Grupo GF?</span>
            </span>
            <span className="text-[11px] font-semibold text-white px-2.5 py-1 rounded-full" style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
              Seja parceiro
            </span>
          </Link>

          {/* Identidade */}
          <div className="text-center pt-2 border-t border-cyan-500/10 space-y-1">
            <p className="font-bold text-sm text-cyan-400">GRUPO GF REDE VAREJISTA</p>
            <p className="text-xs text-slate-300">CNPJ {settings.cnpj}</p>
            <p className="text-xs text-slate-300">{settings.owner}</p>
            {settings.whatsapp && <p className="text-xs text-slate-400">WhatsApp: {settings.whatsapp}</p>}
            <p className="text-xs text-slate-500 pt-1">© 2026 Todos os direitos reservados</p>
          </div>
        </div>
      </footer>



      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-500/10 grid grid-cols-5" style={{ background: "#2968c8" }}>
        {[
          { t: "home", label: "Início", icon: HomeIcon },
          { t: "categories", label: "Categorias", icon: Grid },
          { t: "cart", label: "Carrinho", icon: ShoppingCart, badge: cartCount },
          { t: "orders", label: "Pedidos", icon: Package },
          { t: "profile", label: "Perfil", icon: User },
        ].map(b => (
          <button key={b.t} onClick={() => setTab(b.t as Tab)}
            className={`py-2.5 flex flex-col items-center gap-1 text-[10px] relative ${tab === b.t ? "text-cyan-400" : "text-slate-400"}`}>
            <b.icon size={20} />
            {b.label}
            {b.badge && b.badge > 0 ? (
              <span className="absolute top-1 right-[28%] bg-red-500 text-white text-[9px] min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
                {b.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Product modal */}
      {productModal && (
        <ProductModal product={productModal} onClose={() => setProductModal(null)}
          onAdd={() => { addToCart(productModal.id); setProductModal(null); }}
          isFav={user?.favorites.includes(productModal.id) ?? false}
          onFav={() => toggleFavorite(productModal.id)}
          user={user} orders={orders}
          allProducts={products}
          onOpenProduct={(p) => setProductModal(p)}
          onCategoryClick={(cat) => {
            setActiveCategory(cat);
            setSearch("");
            setTab("home");
            setProductModal(null);
          }}
        />
      )}

      {/* Global Addresses modal */}
      {openAddressesGlobal && (
        <AddressesModal
          onClose={() => setOpenAddressesGlobal(false)}
          showToast={showToast}
          onPersist={(next) => setAddressesList(next)}
        />
      )}


      {/* Checkout modal: delivery info before payment */}
      {checkoutOpen && (
        <>
          <div className="fixed inset-0 bg-black/70 z-[990]" onClick={() => !mpLoading && setCheckoutOpen(false)} />
          <div className="fixed inset-0 z-[995] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
            <form onSubmit={submitCheckout}
              className="pointer-events-auto w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#2968c8] sm:rounded-2xl rounded-t-2xl border border-cyan-500/20 p-5 space-y-3">
              <div className="flex items-center justify-between sticky top-0 -mx-5 -mt-5 px-5 pt-5 pb-3 bg-[#2968c8] border-b border-white/5 z-10">
                <h3 className="font-bold text-lg">Dados de entrega</h3>
                <button type="button" onClick={() => setCheckoutOpen(false)} disabled={mpLoading}
                  className="p-1.5 rounded hover:bg-white/10"><X size={18} /></button>
              </div>

              <p className="text-xs font-semibold text-cyan-300 uppercase">Quem está comprando</p>
              <div className="grid grid-cols-2 gap-2">
                <input required maxLength={120} placeholder="Seu nome*" value={delivery.customerName}
                  onChange={e => setDelivery(d => ({ ...d, customerName: e.target.value }))}
                  className="col-span-2 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={30} placeholder="Telefone/WhatsApp*" value={delivery.customerPhone}
                  onChange={e => setDelivery(d => ({ ...d, customerPhone: e.target.value }))}
                  className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input type="email" maxLength={255} placeholder="Email (opcional)" value={delivery.customerEmail}
                  onChange={e => setDelivery(d => ({ ...d, customerEmail: e.target.value }))}
                  className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
              </div>

              <p className="text-xs font-semibold text-orange-300 uppercase pt-2">Quem vai receber</p>
              <div className="grid grid-cols-2 gap-2">
                <input required maxLength={120} placeholder="Nome do destinatário*" value={delivery.recipientName}
                  onChange={e => setDelivery(d => ({ ...d, recipientName: e.target.value }))}
                  className="col-span-2 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={30} placeholder="Telefone do destinatário*" value={delivery.recipientPhone}
                  onChange={e => setDelivery(d => ({ ...d, recipientPhone: e.target.value }))}
                  className="col-span-2 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
              </div>

              <p className="text-xs font-semibold text-orange-300 uppercase pt-2">Endereço de entrega</p>
              <div className="grid grid-cols-3 gap-2">
                <input required maxLength={15} placeholder="CEP*" value={delivery.zip}
                  onChange={e => setDelivery(d => ({ ...d, zip: e.target.value }))}
                  className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={200} placeholder="Rua*" value={delivery.street}
                  onChange={e => setDelivery(d => ({ ...d, street: e.target.value }))}
                  className="col-span-2 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={20} placeholder="Nº*" value={delivery.number}
                  onChange={e => setDelivery(d => ({ ...d, number: e.target.value }))}
                  className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input maxLength={120} placeholder="Complemento" value={delivery.complement}
                  onChange={e => setDelivery(d => ({ ...d, complement: e.target.value }))}
                  className="col-span-2 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={120} placeholder="Bairro*" value={delivery.neighborhood}
                  onChange={e => setDelivery(d => ({ ...d, neighborhood: e.target.value }))}
                  className="col-span-3 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={120} placeholder="Cidade*" value={delivery.city}
                  onChange={e => setDelivery(d => ({ ...d, city: e.target.value }))}
                  className="col-span-2 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input required maxLength={60} placeholder="UF*" value={delivery.state}
                  onChange={e => setDelivery(d => ({ ...d, state: e.target.value.toUpperCase() }))}
                  className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <input maxLength={255} placeholder="Ponto de referência" value={delivery.reference}
                  onChange={e => setDelivery(d => ({ ...d, reference: e.target.value }))}
                  className="col-span-3 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm" />
                <textarea maxLength={1000} placeholder="Observações (opcional)" value={delivery.notes}
                  onChange={e => setDelivery(d => ({ ...d, notes: e.target.value }))}
                  className="col-span-3 bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm min-h-[60px]" />
              </div>

              <div className="bg-[#2968c8] border border-cyan-500/10 rounded-lg p-3 text-sm flex justify-between font-bold">
                <span>Total a pagar</span><span className="text-cyan-300">{brl(total)}</span>
              </div>

              <button type="submit" disabled={mpLoading}
                className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#00b1ea,#3483FA)" }}>
                <CreditCard size={18} /> {mpLoading ? "Redirecionando para o Mercado Pago..." : "Confirmar e ir para pagamento"}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Você será levado ao Mercado Pago para pagar com Cartão, Pix ou Boleto.
              </p>
            </form>
          </div>
        </>
      )}

      <style>{`@keyframes slideDown { from { opacity:0; transform: translate(-50%, -20px); } to { opacity:1; transform: translate(-50%, 0); } }`}</style>
    </div>
  );
}

/* ---------- Register ---------- */
/* ---------- Welcome ---------- */
function WelcomeScreen() {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-6" style={{ background: "#2968c8" }}>
      <div className="w-full max-w-sm text-center">
        <img src={logo} alt="Grupo GF" className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white p-1.5" />
        <h1 className="font-bold text-2xl text-white">GRUPO GF</h1>
        <p className="text-xs tracking-[0.3em] text-orange-400 font-semibold">REDE VAREJISTA</p>
        <p className="text-sm mt-2 text-slate-400 mb-8">Escolha como deseja entrar</p>
        <div className="space-y-3">
          <a href="/auth?tipo=lojista" className="block w-full py-3 rounded-lg font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#0a4fe3,#1e90ff)" }}>
            Sou Lojista (Atacado)
          </a>
          <a href="/auth?tipo=pessoa_fisica" className="block w-full py-3 rounded-lg font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#ff6a00,#ff3d3d)" }}>
            Sou Pessoa Física
          </a>
          <a href="/auth" className="block text-sm text-cyan-300 mt-4 underline">Já tenho conta — Entrar</a>
        </div>
      </div>
    </div>
  );
}

/* ---------- Register (legado, não usado) ---------- */
function RegisterScreen({ onRegister }: { onRegister: (u: UserData) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email) { setErr("Preencha todos os campos."); return; }
    if (pin && !/^\d{4,6}$/.test(pin)) { setErr("PIN deve ter 4 a 6 dígitos."); return; }
    onRegister({ name, phone, email, pin, favorites: [] }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center px-6" style={{ background: "#2968c8" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src={logo} alt="Grupo GF" className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-white p-1.5" />
          <h1 className="font-bold text-xl text-white">GRUPO GF</h1>
          <p className="text-xs tracking-[0.3em] text-orange-400 font-semibold">REDE VAREJISTA</p>
          <p className="text-sm mt-1 text-slate-400">Bem-vindo à nossa loja</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
          <input value={name} onChange={e => setName(e.target.value)} required
            className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3.5 py-2.5 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            placeholder="Seu nome completo" />
          <input value={phone} onChange={e => setPhone(e.target.value)} required
            className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3.5 py-2.5 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            placeholder="Telefone (DDD + número)" />
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
            className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3.5 py-2.5 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            placeholder="E-mail" />
          <input value={pin} onChange={e => setPin(e.target.value)} type="password" maxLength={6}
            className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3.5 py-2.5 text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
            placeholder="PIN (4-6 dígitos, opcional)" />
          <button type="submit" className="w-full py-3 rounded-lg font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
            Cadastrar / Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Product Card ---------- */
function ProductCard({ product, onOpen, onAdd, isFav, onFav, onCategoryClick }: {
  product: Product; onOpen: () => void; onAdd: () => void; isFav: boolean; onFav: () => void;
  onCategoryClick?: (category: string) => void;
}) {
  // Pseudo-rating derived from product id so the UI feels alive even before real reviews load
  const seed = product.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rating = 4.1 + ((seed % 10) / 10); // 4.1 - 5.0
  const ratingCount = 25 + (seed % 150);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const lowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden h-full">
      <div className="relative cursor-pointer bg-slate-50/50 aspect-square flex items-center justify-center overflow-hidden" onClick={onOpen}>
        <img src={product.image || fallbackProductImage} alt={product.name}
          className="max-h-full max-w-full object-contain transition-transform duration-500 hover:scale-105 p-2"
          loading="lazy" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          <div className="flex flex-col gap-1">
            {discount > 0 && (
              <span className="bg-[#00A650] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                {discount}% OFF
              </span>
            )}
            {lowStock && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                Apenas {product.stock} restam
              </span>
            )}
          </div>
          <button onClick={e => { e.stopPropagation(); onFav(); }}
            aria-label="Favoritar"
            className="w-8 h-8 rounded-full bg-white/90 shadow-sm border border-slate-100 flex items-center justify-center hover:bg-white text-slate-400 hover:text-red-500 hover:scale-110 transition-all duration-200">
            <Heart size={16} className={isFav ? "fill-red-500 text-red-500" : ""} />
          </button>
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-between bg-white border-t border-slate-100">
        <div>
          {/* Category breadcrumb */}
          <span 
            onClick={(e) => {
              e.stopPropagation();
              if (onCategoryClick) onCategoryClick(product.category);
            }}
            className="text-[10px] font-bold text-slate-400 hover:text-[#2968c8] uppercase tracking-wider cursor-pointer transition-colors"
          >
            {product.category}
          </span>
          
          {/* Product Title */}
          <h3 className="text-xs sm:text-sm font-semibold text-[#1A1A1A] hover:text-[#1E3A8A] leading-snug line-clamp-2 min-h-[2.5rem] mt-0.5 cursor-pointer" onClick={onOpen}>
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mt-1">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={11}
                  className={i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"} />
              ))}
            </div>
            <span className="text-[10px] font-medium text-slate-500">({ratingCount})</span>
          </div>

          {/* Location badge if present */}
          {(product.cidade || product.estado || product.bairro) && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 w-fit">
              <MapPin size={11} className="text-[#1E3A8A] shrink-0" />
              <span className="truncate max-w-[150px]">
                {[product.bairro, product.cidade, product.estado].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* Shipping highlight */}
          <div className="mt-2 flex items-center gap-1">
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-1.5 py-0.5 rounded border border-emerald-200">
              Frete Grátis
            </span>
            <span className="bg-[#1E3A8A]/10 text-[#1E3A8A] text-[9px] font-extrabold px-1.5 py-0.5 rounded">
              Full
            </span>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-slate-100">
          {product.oldPrice && <p className="text-[11px] text-slate-400 line-through leading-none mb-0.5">{brl(product.oldPrice)}</p>}
          <div className="flex items-baseline gap-1.5">
            <span className="font-extrabold text-[#1A1A1A] text-lg leading-tight">
              {brl(product.price)}
            </span>
            {discount > 0 && <span className="text-xs font-bold text-[#00A650]">{discount}% OFF</span>}
          </div>
          
          <button onClick={onAdd}
            className="mt-3 w-full py-2 rounded-lg text-xs font-bold text-white bg-[#0A192F] hover:bg-[#1E3A8A] transition-colors duration-200 shadow-sm flex items-center justify-center gap-1">
            <Plus size={14} /> Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}


/* ---------- Product Modal ---------- */
type Review = {
  id: string; product_id: string; user_id: string; user_name: string;
  rating: number; comment: string; photos: string[]; videos: string[]; created_at: string;
};

function ProductModal({ product, onClose, onAdd, isFav, onFav, user, orders, allProducts, onOpenProduct, onCategoryClick }: {
  product: Product; onClose: () => void; onAdd: () => void; isFav: boolean; onFav: () => void;
  user: UserData | null; orders: Order[];
  allProducts: Product[]; onOpenProduct: (p: Product) => void;
  onCategoryClick?: (category: string) => void;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Elegibilidade: usuário logado com pedido entregue contendo este produto (match por nome)
  const eligible = useMemo(() => {
    if (!user) return false;
    return orders.some(o => o.status === "Entregue" && o.items.some(it => it.name === product.name));
  }, [user, orders, product.name]);

  const myReviewExists = useMemo(() => {
    if (!user) return false;
    return reviews.some(r => r.user_name === user.name);
  }, [reviews, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false }
      if (!cancelled) {
        const rows = (((data as unknown) as Review[]) ?? []);
        const sign = async (path: string) => {
          if (/^https?:\/\//.test(path)) return path;
          const { data: signedUrl } = await supabase.storage.from("review-photos").createSignedUrl(path, 60 * 60);
          return signedUrl?.signedUrl ?? path;
        };
        const resolved = await Promise.all(rows.map(async (review) => {
          const photos = await Promise.all((review.photos ?? []).map(sign));
          const videos = await Promise.all((((review as any).videos as string[]) ?? []).map(sign));
          return { ...review, photos, videos };
        }));
        setReviews(resolved);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [product.id]);

  const avgRating = reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 4);
    setPhotoFiles(files);
  };

  const handleVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 2);
    setVideoFiles(files);
  };

  const submitReview = async () => {
    if (!user) return;
    setErr(null); setSubmitting(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Faça login novamente.");

      const photoUrls: string[] = [];
      for (const file of photoFiles) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${uid}/${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("review-photos").upload(path, file, { upsert: false }
        if (upErr) throw upErr;
        photoUrls.push(path);
      }

      const videoUrls: string[] = [];
      for (const file of videoFiles) {
        if (file.size > 30 * 1024 * 1024) throw new Error("Vídeo muito grande (máx. 30MB).");
        const ext = file.name.split(".").pop() || "mp4";
        const path = `${uid}/${product.id}-vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("review-photos").upload(path, file, { upsert: false }
        if (upErr) throw upErr;
        videoUrls.push(path);
      }

      let inserted: any = null;
      let insErr: any = null;
      ({ data: inserted, error: insErr } = await (supabase as any)
        .from("product_reviews")
        .insert({
          product_id: product.id,
          user_id: uid,
          user_name: user.name,
          rating, comment, photos: photoUrls, videos: videoUrls,
        })
        .select()
        .single());
      if (insErr && /videos/i.test(insErr.message || "")) {
        // Banco ainda sem a coluna de vídeos — salva sem vídeos
        ({ data: inserted, error: insErr } = await (supabase as any)
          .from("product_reviews")
          .insert({ product_id: product.id, user_id: uid, user_name: user.name, rating, comment, photos: photoUrls })
          .select()
          .single());
      }
      if (insErr) throw insErr;

      const sign = async (path: string) => {
        const { data: signedUrl } = await supabase.storage.from("review-photos").createSignedUrl(path, 60 * 60);
        return signedUrl?.signedUrl ?? path;
      };
      const visiblePhotos = await Promise.all(photoUrls.map(sign));
      const visibleVideos = await Promise.all(videoUrls.map(sign));
      setReviews(prev => [{ ...((inserted as unknown) as Review), photos: visiblePhotos, videos: visibleVideos }, ...prev]);
      setShowForm(false); setRating(5); setComment(""); setPhotoFiles([]); setVideoFiles([]);
    } catch (e: any) {
      setErr(e?.message || "Erro ao enviar avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#2968c8] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="bg-[#2968c8] min-h-screen w-full">
        <div className="relative">
          <img src={product.image} alt="" className="w-full aspect-square object-cover" />
          <button onClick={onClose} className="absolute top-4 left-4 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center backdrop-blur">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 pb-28">
          <button 
            onClick={() => {
              if (onCategoryClick) onCategoryClick(product.category);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline decoration-dotted tracking-wider uppercase text-left transition-colors"
          >
            {product.category}
          </button>
          <h3 className="font-bold text-lg mt-1">{product.name}</h3>
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#2968c8] border border-cyan-500/15 px-3 py-2">
            <Store size={16} className="text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-400">Vendido por</div>
              <div className="text-sm font-semibold text-white truncate">{product.sellerName || "GRUPO GF REDE VAREJISTA"}</div>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            {product.oldPrice && <span className="text-sm text-slate-500 line-through">{brl(product.oldPrice)}</span>}
            <span className="text-2xl font-bold text-cyan-400">{brl(product.price)}</span>
          </div>
          {reviews.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#2968c8] border border-cyan-500/15 px-3 py-2">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={15} className={i <= Math.round(avgRating) ? "fill-yellow-400 text-yellow-400" : "text-slate-600"} />
                ))}
              </div>
              <span className="text-sm font-bold text-yellow-300">{avgRating.toFixed(1)}/5</span>
              <span className="text-xs text-slate-400">· {reviews.length.toLocaleString("pt-BR")} {reviews.length === 1 ? "avaliação" : "avaliações"}</span>
            </div>
          )}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Variações</div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => {
                  const label = v.name || [v.attributes?.color, v.attributes?.size].filter(Boolean).join(" ") || "Variação";
                  const vPrice = v.discount_price ?? v.price;
                  return (
                    <div key={v.id} className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-[#2968c8] px-2.5 py-1.5">
                      {v.image_url && <img src={v.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div className="text-xs">
                        <div className="font-semibold text-white">{label}</div>
                        <div className="text-cyan-300">{brl(Number(vPrice) || 0)} <span className="text-slate-400">· {v.stock} un.</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {product.description && <p className="text-sm text-slate-300 mt-3">{product.description}</p>}
          
          {(product.cidade || product.estado || product.bairro || product.regiao) && (
            <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 p-3 flex items-start gap-2.5">
              <MapPin size={16} className="text-cyan-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-[11px] uppercase tracking-wide text-cyan-300 font-bold">Local de Atendimento / Prestação</div>
                <p className="text-xs text-slate-200 mt-0.5">
                  Disponível para: <strong className="text-white">{[product.bairro, product.regiao, product.cidade, product.estado].filter(Boolean).join(", ")}</strong>
                </p>
              </div>
            </div>
          )}

          {product.notes && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-[11px] uppercase tracking-wide text-amber-300 mb-1 font-semibold">Notas do vendedor</div>
              <p className="text-xs text-amber-100 whitespace-pre-line">{product.notes}</p>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3">Estoque: {product.stock} unidades</p>
          <div className="flex gap-2 mt-5">
            <button onClick={onFav} className="px-4 py-2.5 rounded-lg border border-cyan-500/30">
              <Heart size={18} className={isFav ? "fill-red-500 text-red-500" : ""} />
            </button>
            <button onClick={onAdd}
              className="flex-1 py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
              <ShoppingCart size={18} /> Adicionar ao carrinho
            </button>
          </div>

          {/* Chat com o vendedor */}
          <ChatButton productId={product.id} productName={product.name} sellerName={product.sellerName || "GRUPO GF"} />

          {/* Selo Compra Segura GF */}
          <CompraSeguraSeal />

          {/* Avaliações */}
          <div className="mt-6 pt-5 border-t border-cyan-500/10">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm flex items-center gap-2"><Star size={16} className="text-yellow-400" /> Avaliações</h4>
              {eligible && !myReviewExists && !showForm && (
                <button onClick={() => setShowForm(true)} className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Avaliar
                </button>
              )}
            </div>

            {!user && (
              <p className="text-xs text-slate-400 mb-3">Faça login para avaliar este produto.</p>
            )}
            {user && !eligible && (
              <p className="text-xs text-slate-400 mb-3">Apenas clientes que receberam este produto podem avaliar.</p>
            )}
            {user && eligible && myReviewExists && !showForm && (
              <p className="text-xs text-emerald-400 mb-3">✓ Você já avaliou este produto.</p>
            )}

            {showForm && (
              <div className="bg-[#2968c8] border border-cyan-500/20 rounded-xl p-3 mb-4 space-y-3">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} onClick={() => setRating(i)} type="button">
                      <Star size={24} className={i <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  placeholder="Conte como foi sua experiência..."
                  maxLength={500}
                  className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2 text-sm min-h-[80px]"
                />
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-cyan-400 cursor-pointer">
                    <Upload size={14} /> Adicionar fotos (até 4)
                    <input type="file" accept="image/*" multiple hidden onChange={handlePhotoPick} />
                  </label>
                  {photoFiles.length > 0 && (
                    <p className="text-[10px] text-slate-400">{photoFiles.length} foto(s) selecionada(s)</p>
                  )}
                  <label className="flex items-center gap-2 text-xs text-cyan-400 cursor-pointer">
                    <Camera size={14} /> Adicionar vídeos curtos (até 2, máx. 30MB)
                    <input type="file" accept="video/*" multiple hidden onChange={handleVideoPick} />
                  </label>
                  {videoFiles.length > 0 && (
                    <p className="text-[10px] text-slate-400">{videoFiles.length} vídeo(s) selecionado(s)</p>
                  )}
                </div>
                {err && <p className="text-xs text-red-400">{err}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setShowForm(false); setErr(null); }} className="flex-1 py-2 rounded-lg border border-slate-600 text-xs">Cancelar</button>
                  <button onClick={submitReview} disabled={submitting || !comment.trim()}
                    className="flex-1 py-2 rounded-lg bg-cyan-500 text-[#2968c8] font-semibold text-xs disabled:opacity-50">
                    {submitting ? "Enviando..." : "Publicar"}
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-400">Carregando...</p>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma avaliação ainda. Seja o primeiro!</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{r.user_name || "Cliente"}</p>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={12} className={i <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-xs text-slate-300 mb-2">{r.comment}</p>}
                    {r.photos.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto">
                        {r.photos.map((url, i) => (
                          <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded" />
                        ))}
                      </div>
                    )}
                    {(r.videos?.length ?? 0) > 0 && (
                      <div className="flex gap-1 overflow-x-auto mt-1">
                        {r.videos.map((url, i) => (
                          <video key={i} src={url} controls preload="metadata" className="w-32 h-20 rounded bg-black object-cover" />
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Produtos do mesmo vendedor */}
          {(() => {
            const sameSeller = allProducts.filter(p =>
              p.id !== product.id &&
              ((product.partnerId && p.partnerId === product.partnerId) ||
               (!product.partnerId && !p.partnerId && p.sellerName === product.sellerName))
            ).slice(0, 12);
            if (sameSeller.length === 0) return null;
            return (
              <div className="mt-6 pt-5 border-t border-cyan-500/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <Store size={16} className="text-cyan-400" /> Produtos do Mesmo Vendedor
                  </h4>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x">
                  {sameSeller.map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => onOpenProduct(sp)}
                      className="snap-start shrink-0 w-32 text-left bg-[#2968c8] border border-cyan-500/15 rounded-lg overflow-hidden hover:border-cyan-400/40 transition"
                    >
                      <div className="aspect-square bg-[#2968c8]">
                        <img src={sp.image} alt={sp.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] text-white line-clamp-2 leading-tight min-h-[28px]">{sp.name}</p>
                        <p className="mt-1 text-sm font-bold text-cyan-400">{brl(sp.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ---------- Profile ---------- */
function WalletInline() {
  const fetchWallet = useServerFn(getWallet);
  const [data, setData] = useState<{ available: number; pending: number; cashback: number } | null>(null);
  useEffect(() => {
    let active = true;
    fetchWallet().then((r: any) => {
      if (!active) return;
      const w = r?.wallet ?? {};
      setData({
        available: Number(w.available_balance ?? 0),
        pending: Number(w.pending_balance ?? 0),
        cashback: Number(w.total_cashback ?? 0),
      }
    }).catch(() => active && setData({ available: 0, pending: 0, cashback: 0 }));
    return () => { active = false; };
  }, [fetchWallet]);

  return (
    <div className="space-y-3">
      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-4">
        {/* Header: Minha carteira */}
        <Link to="/carteira" className="flex items-center justify-between text-left mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[#2968c8]" />
            <span className="font-bold text-sm text-slate-800">Minha carteira</span>
          </div>
          <div className="flex items-center text-xs text-[#2968c8] font-bold gap-1 hover:underline transition-colors">
            <span>Acessar Carteira ›</span>
          </div>
        </Link>

        {/* 3 Columns details */}
        <div className="grid grid-cols-3 gap-1 text-center py-1">
          <Link to="/carteira" className="flex flex-col items-center justify-between hover:bg-slate-50 p-1.5 rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center mb-1.5 border border-blue-100/50">
              <Wallet size={18} className="text-[#2968c8]" />
            </div>
            <div className="text-xs font-extrabold text-slate-800">
              {data ? brl(data.available) : "R$ 0,00"}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Saldo GF</div>
          </Link>

          <Link to="/carteira" className="flex flex-col items-center justify-between hover:bg-slate-50 p-1.5 rounded-xl transition-colors border-x border-slate-100">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center mb-1.5 border border-amber-100/50">
              <Coins size={18} className="text-amber-500" />
            </div>
            <div className="text-xs font-extrabold text-slate-800">
              {data ? Math.round(data.cashback * 10) : 100}
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Moedas GF</div>
          </Link>

          <Link to="/carteira" className="flex flex-col items-center justify-between hover:bg-slate-50 p-1.5 rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center mb-1.5 border border-rose-100/50">
              <Ticket size={18} className="text-rose-500" />
            </div>
            <div className="text-xs font-extrabold text-slate-800">
              {data ? 3 : 0} Cupons
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Disponíveis</div>
          </Link>
        </div>

        {/* Thin divider */}
        <div className="border-t border-slate-100 my-3.5" />

        {/* Action highlights inline row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: "/carteira", hash: "deposit", icon: ArrowDownToLine, label: "Depositar", sub: "via PIX", bg: "bg-emerald-50", color: "text-emerald-600", borderColor: "border-emerald-100" },
            { to: "/carteira", hash: "withdraw", icon: ArrowUpFromLine, label: "Sacar", sub: "via PIX", bg: "bg-rose-50", color: "text-rose-600", borderColor: "border-rose-100" },
            { to: "/carteira", hash: "transfer", icon: ArrowLeftRight, label: "Transferir", sub: "via PIX", bg: "bg-blue-50", color: "text-blue-600", borderColor: "border-blue-100" },
            { to: "/carteira", hash: "extrato", icon: FileText, label: "Extrato", sub: "lançamentos", bg: "bg-amber-50", color: "text-amber-600", borderColor: "border-amber-100" },
          ].map((a) => (
            <Link key={a.label} to={`${a.to}#${a.hash}`}
              className="rounded-xl p-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-center flex flex-col items-center justify-between gap-1 transition-all">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.bg} border ${a.borderColor} mb-0.5`}>
                <a.icon size={16} className={a.color} />
              </div>
              <div className="text-[10px] font-bold text-slate-800 leading-tight">{a.label}</div>
              <div className="text-[8px] text-slate-400 font-medium leading-none">{a.sub}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, setUser, orders, products, remoteOrders = [], onOpenProduct, onGoOrders, onGoFaq, onGoGmail, onGoFavorites, onGoCashback, onGoNotifications, cashbackAvailable, unreadNotifs, showToast, isOwner, onGoAdmin, onSignOut, onOpenAddresses }: {
  user: UserData; setUser: (u: UserData | null) => void;
  orders: Order[]; products: Product[];
  remoteOrders?: any[];
  onOpenProduct: (p: Product) => void;
  onGoOrders: () => void;
  onGoFaq: () => void;
  onGoGmail: () => void;
  onGoFavorites: () => void;
  onGoCashback: () => void;
  onGoNotifications: () => void;
  cashbackAvailable: number;
  unreadNotifs: number;
  showToast: (m: string) => void;
  isOwner?: boolean;
  onGoAdmin?: () => void;
  onSignOut: () => void | Promise<void>;
  onOpenAddresses?: () => void;
}) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  
  // Calculate total spent across all non-cancelled orders to determine loyalty tiers
  const activeRemoteOrders = remoteOrders.filter(o => o.status !== "cancelled");
  const totalSpent = orders.reduce((s, o) => s + o.total, 0) + activeRemoteOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const favs = products.filter(p => user.favorites.includes(p.id));

  // Determine loyalty tier names & colors (Shopee Fidelidade style)
  let levelName = "Membro Iniciante";
  let levelColor = "text-slate-300";
  if (totalSpent > 0 && totalSpent < 150) {
    levelName = "Membro Bronze";
    levelColor = "text-amber-600";
  } else if (totalSpent >= 150 && totalSpent < 600) {
    levelName = "Membro Prata";
    levelColor = "text-slate-200";
  } else if (totalSpent >= 600 && totalSpent < 2000) {
    levelName = "Membro Ouro";
    levelColor = "text-amber-400";
  } else if (totalSpent >= 2000) {
    levelName = "Membro Platina";
    levelColor = "text-cyan-300";
  }

  // Calculate purchase stage counts for the Shopee tracker
  const pendingCount = orders.filter(o => o.status === "Pendente").length + 
                       remoteOrders.filter(o => o.status === "pending").length;

  const preparingCount = orders.filter(o => o.status === "Confirmado" && !o.tracking).length + 
                         remoteOrders.filter(o => o.status === "approved" || o.status === "preparing").length;

  const transitCount = orders.filter(o => o.status === "Confirmado" && o.tracking).length + 
                       remoteOrders.filter(o => o.status === "shipped" || o.status === "out_for_delivery").length;

  const deliveredCount = orders.filter(o => o.status === "Entregue").length + 
                         remoteOrders.filter(o => o.status === "delivered").length;

  const refundCount = remoteOrders.filter(o => o.status === "cancelled").length;

  const [openInfo, setOpenInfo] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openFavs, setOpenFavs] = useState(false);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const data = await fileToDataUrl(file);
    setUser({ ...user, avatar: data }
    showToast("Foto atualizada");
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=06b6d4`;

  const signOut = () => { void onSignOut(); };

  return (
    <div className="bg-[#F4F4F6] text-slate-800 min-h-screen pb-12 space-y-4">
      {/* Shopee-style Header Banner in User's Brand Navy/Blue Gradient */}
      <div className="relative px-4 pt-5 pb-8 overflow-hidden rounded-b-3xl shadow-md"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #2968c8 100%)" }}>
        
        {/* Decorative logo watermark */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <img src={logo} alt="" aria-hidden
            className="w-[110%] max-w-none object-contain opacity-5 blur-[0.5px] select-none" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-black/5" />

        {/* Top-right Action controls (Gear / FAQ / Gmail Support) */}
        <div className="relative flex justify-end gap-3 mb-4 z-10">
          <button onClick={() => setOpenInfo(true)} title="Editar Perfil" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <Settings size={18} />
          </button>
          <button onClick={onGoFaq} title="Perguntas Frequentes" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <HelpCircle size={18} />
          </button>
          <button onClick={onGoGmail} title="Suporte Gmail" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
            <Mail size={18} />
          </button>
        </div>

        {/* Profile Details */}
        <div className="relative flex items-center gap-4 z-10">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/95 shadow-md cursor-pointer bg-slate-800"
              onClick={() => fileRef.current?.click()}>
              <img src={user.avatar || defaultAvatar} alt="Foto de perfil" className="w-full h-full object-cover" />
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white text-[#1e3a8a] flex items-center justify-center shadow-md active:scale-90 transition-all border border-slate-200">
              <Camera size={13} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          </div>

          <div className="flex-1 text-left min-w-0">
            <p className="font-bold text-lg sm:text-xl truncate text-white tracking-tight">{user.name}</p>
            <p className="text-xs sm:text-sm text-white/80 truncate font-medium">{user.email}</p>
            
            {/* Gamified Shopee Fidelidade badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/15 text-white border border-white/20 mt-2 shadow-sm">
              <Trophy size={11} className={`${levelColor}`} />
              <span>{levelName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shopee-style wallet highlights inline */}
      <div className="px-4 -mt-6 relative z-20">
        <WalletInline />
      </div>

      {/* Shopee Style - "Minhas Compras" Order Tracking Card */}
      <div className="mx-4 bg-white shadow-sm border border-slate-100 rounded-2xl p-4">
        <button onClick={onGoOrders} className="w-full flex items-center justify-between text-left mb-3.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[#2968c8]" />
            <span className="font-bold text-sm text-slate-800">Minhas compras</span>
          </div>
          <div className="flex items-center text-xs text-slate-400 font-medium gap-1 hover:text-slate-600 transition-colors">
            <span>Ver Histórico ›</span>
          </div>
        </button>

        <div className="grid grid-cols-5 gap-1 pt-1">
          {[
            { label: "A pagar", icon: CreditCard, count: pendingCount, color: "text-slate-600 hover:text-slate-800" },
            { label: "Preparando", icon: Package, count: preparingCount, color: "text-slate-600 hover:text-slate-800" },
            { label: "A receber", icon: Truck, count: transitCount, color: "text-slate-600 hover:text-slate-800" },
            { label: "Avaliar", icon: MessageCircle, count: deliveredCount, color: "text-slate-600 hover:text-slate-800" },
            { label: "Reembolso", icon: RotateCcw, count: refundCount, color: "text-slate-600 hover:text-slate-800" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={onGoOrders}
              className="flex flex-col items-center justify-center p-1 relative rounded-xl transition-all hover:bg-slate-50"
            >
              <div className="relative p-2 rounded-full bg-slate-50 mb-1 flex items-center justify-center border border-slate-100/50">
                <item.icon size={20} className={item.color} />
                {item.count > 0 && (
                  <span className="absolute -top-1 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1.5 text-[9px] font-extrabold text-white leading-none shadow-md border border-white">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 text-center leading-tight mt-0.5">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Promotional Banner like Shopee Gift Cards / Referrals */}
      <div onClick={() => navigate("/indique-e-ganhe")} className="mx-4 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between shadow-sm cursor-pointer transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100/50">
            <Gift size={18} className="text-amber-500 animate-bounce" />
          </div>
          <div className="text-left">
            <span className="block font-bold text-xs text-slate-800">Indique e ganhe</span>
            <span className="block text-[10px] text-slate-400 font-medium">Convide seus amigos e ganhe R$ 5,00 de bônus por indicação</span>
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-400" />
      </div>

      {/* Shopee Style - "Mais Atividades" 2-Column Bento Shortcuts Grid */}
      <div className="mx-4 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="font-bold text-sm text-slate-800">Mais atividades</span>
          <span className="text-xs text-slate-400 font-medium">Ver tudo ›</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Meus favoritos", icon: Heart, badge: favs.length, onClick: () => setOpenFavs(true), bg: "bg-rose-50", iconColor: "text-rose-500" },
            { label: "Cashback e Recompensas", icon: Gift, sub: brl(cashbackAvailable), onClick: onGoCashback, bg: "bg-emerald-50", iconColor: "text-emerald-500" },
            { label: "Visto recentemente", icon: History, onClick: onGoOrders, bg: "bg-blue-50", iconColor: "text-blue-500" },
            { label: "Seja um Parceiro", icon: Store, onClick: () => navigate("/seja-um-parceiro"), bg: "bg-purple-50", iconColor: "text-purple-500" },
            { label: "Programa de Fidelidade", icon: Trophy, onClick: onGoFaq, bg: "bg-amber-50", iconColor: "text-amber-500" },
            { label: "Live e Vídeos", icon: Tv, onClick: onGoFaq, bg: "bg-red-50", iconColor: "text-red-500" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-all text-left shadow-sm group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.bg} group-hover:scale-105 transition-transform relative`}>
                  <item.icon size={16} className={item.iconColor} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white leading-none shadow-md">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate leading-tight">{item.label}</span>
                  {item.sub && <span className="text-[10px] text-slate-400 font-bold mt-0.5 leading-none">{item.sub}</span>}
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Settings & Support Card */}
      <div className="mx-4 bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100">
        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
          <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">Suporte e Configurações</span>
        </div>
        {isOwner && onGoAdmin && (
          <MenuRow icon={Shield} label="Painel de Administração"
            desc="Painel administrativo da loja para donos"
            onClick={onGoAdmin} />
        )}
        <MenuRow icon={IdCard} label="Informações do seu Perfil"
          desc="Nome, telefone, CPF, nascimento"
          onClick={() => setOpenInfo(true)} />
        <MenuRow icon={Lock} label="Segurança e Credenciais"
          desc="Alterar e-mail, senha e foto"
          onClick={() => setOpenSecurity(true)} />
        <MenuRow icon={MapPin} label="Endereços de Entrega"
          desc="Salve seus endereços de entrega"
          onClick={onOpenAddresses || (() => setOpenAddresses(true))} />
        <MenuRow icon={HelpCircle} label="Central de Ajuda (FAQ)"
          desc="Tire suas dúvidas ou fale conosco"
          onClick={onGoFaq} />
        <MenuRow icon={Star} label="Sobre o Grupo GF"
          desc="Nossos termos, políticas e equipe"
          onClick={() => setOpenAbout(true)} />
        <MenuRow icon={LogOut} label="Sair da Conta"
          desc="Encerrar a sessão com segurança neste dispositivo"
          danger
          onClick={signOut} />
      </div>

      {/* Danger zone menu */}
      <div className="mx-4 bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
        <MenuRow icon={Trash2} label="Excluir conta permanentemente"
          desc="Apagar permanentemente seus dados do Grupo GF"
          danger
          onClick={() => setOpenDelete(true)} />
      </div>

      {openInfo && <ProfileInfoModal user={user} setUser={setUser} onClose={() => setOpenInfo(false)} />}
      {openSecurity && <SecurityModal user={user} setUser={setUser} onClose={() => setOpenSecurity(false)} showToast={showToast} />}
      {openAbout && <AboutModal onClose={() => setOpenAbout(false)} />}
      {openDelete && <DeleteAccountModal user={user} onClose={() => setOpenDelete(false)} />}
      {openFavs && (
        <div className="fixed inset-0 z-[1100] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpenFavs(false)}>
          <div className="bg-[#2968c8] rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <ModalHeader title="Meus favoritos" onClose={() => setOpenFavs(false)} icon={Heart} />
            <div className="p-4">
              {favs.length === 0 ? (
                <p className="text-sm text-white/70 text-center py-8">Nenhum favorito ainda.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {favs.map(p => (
                    <button key={p.id} onClick={() => { setOpenFavs(false); onOpenProduct(p); }}
                      className="bg-[#2968c8] border border-cyan-500/10 rounded-lg overflow-hidden">
                      <img src={p.image} alt="" className="w-full h-20 object-cover" />
                      <p className="text-[10px] p-1 truncate text-white">{p.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon: Icon, label, desc, onClick, danger, badge }: {
  icon: any; label: string; desc?: string; onClick: () => void; danger?: boolean; badge?: React.ReactNode;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-rose-50 text-rose-500" : "bg-blue-50 text-[#2968c8]"}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${danger ? "text-rose-600" : "text-slate-800"}`}>{label}</p>
        {desc && <p className={`text-xs truncate ${danger ? "text-rose-400" : "text-slate-500"}`}>{desc}</p>}
      </div>
      {badge}
      <span className="text-slate-400 text-lg font-medium">›</span>
    </button>
  );
}

function ModalHeader({ title, onClose, icon: Icon }: { title: string; onClose: () => void; icon: any }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-cyan-500/10 sticky top-0 bg-[#2968c8] z-10">
      <h3 className="font-bold text-base flex items-center gap-2">
        <Icon size={18} className="text-cyan-400" />
        {title}
      </h3>
      <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
        <X size={16} />
      </button>
    </div>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#2968c8] rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ProfileInfoModal({ user, setUser, onClose }: { user: UserData; setUser: (u: UserData) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: user.name, phone: user.phone, cpf: user.cpf || "",
    birthdate: user.birthdate || "", address: user.address || "",
  }
  const save = () => { setUser({ ...user, ...form } onClose(); };
  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title="Informações do perfil" onClose={onClose} icon={IdCard} />
      <div className="p-4 space-y-3">
        {[
          { k: "name" as const, label: "Nome completo", type: "text" },
          { k: "phone" as const, label: "Telefone / WhatsApp", type: "tel" },
          { k: "cpf" as const, label: "CPF", type: "text" },
          { k: "birthdate" as const, label: "Data de nascimento", type: "date" },
          { k: "address" as const, label: "Endereço principal", type: "text" },
        ].map(f => (
          <div key={f.k}>
            <label className="text-xs text-slate-400 mb-1 block">{f.label}</label>
            <input type={f.type} value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
              className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
          </div>
        ))}
        <button onClick={save}
          className="w-full py-2.5 rounded-lg bg-cyan-500 text-[#2968c8] font-semibold text-sm mt-2">
          Salvar alterações
        </button>
      </div>
    </ModalShell>
  );
}

function SecurityModal({ user, setUser, onClose, showToast }: {
  user: UserData; setUser: (u: UserData) => void; onClose: () => void; showToast: (m: string) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState(user.email);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const data = await fileToDataUrl(file);
    setUser({ ...user, avatar: data }
    showToast("Foto atualizada");
  };

  const changePassword = async () => {
    setMsg(null);
    if (newPassword.length < 6) return setMsg({ type: "err", text: "A senha deve ter pelo menos 6 caracteres." }
    if (newPassword !== confirmPassword) return setMsg({ type: "err", text: "As senhas não coincidem." }
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.updateUser({ password: newPassword }
      if (error) throw error;
      setMsg({ type: "ok", text: "Senha alterada com sucesso!" }
      setNewPassword(""); setConfirmPassword("");
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Erro ao alterar senha." }
    } finally { setBusy(false); }
  };

  const changeEmail = async () => {
    setMsg(null);
    if (!newEmail.includes("@")) return setMsg({ type: "err", text: "E-mail inválido." }
    if (newEmail === user.email) return setMsg({ type: "err", text: "Informe um novo e-mail." }
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase.auth.updateUser({ email: newEmail }
      if (error) throw error;
      setMsg({ type: "ok", text: "Solicitação de alteração de e-mail enviada." }
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Erro ao alterar e-mail." }
    } finally { setBusy(false); }
  };

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=06b6d4`;

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title="Segurança" onClose={onClose} icon={Shield} />
      <div className="p-4 space-y-6">
        {/* Photo */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Camera size={14} className="text-cyan-400" /> Foto de perfil</h4>
          <div className="flex items-center gap-3">
            <img src={user.avatar || defaultAvatar} alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400" />
            <div className="flex-1 flex gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 text-[#2968c8] font-semibold text-xs">
                Alterar foto
              </button>
              {user.avatar && (
                <button onClick={() => setUser({ ...user, avatar: undefined })}
                  className="py-2 px-3 rounded-lg border border-red-500/40 text-red-400 text-xs">
                  Remover
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          </div>
        </div>

        <div className="pt-4 border-t border-cyan-500/10">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Lock size={14} className="text-cyan-400" /> Alterar senha</h4>
          <div className="space-y-2">
            <input type="password" placeholder="Nova senha (mín. 6 caracteres)"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            <input type="password" placeholder="Confirmar nova senha"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            <button onClick={changePassword} disabled={busy}
              className="w-full py-2.5 rounded-lg bg-cyan-500 text-[#2968c8] font-semibold text-sm disabled:opacity-50">
              {busy ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-cyan-500/10">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Mail size={14} className="text-cyan-400" /> Alterar e-mail</h4>
          <div className="space-y-2">
            <input type="email" placeholder="Novo e-mail"
              value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            <button onClick={changeEmail} disabled={busy}
              className="w-full py-2.5 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm disabled:opacity-50">
              {busy ? "Enviando..." : "Atualizar e-mail"}
            </button>
          </div>
        </div>

        {msg && (
          <p className={`text-xs ${msg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>
        )}
      </div>
    </ModalShell>
  );
}

function AddressesModal({ onClose, showToast, onPersist }: { onClose: () => void; showToast: (m: string) => void; onPersist?: (next: Address[]) => void }) {
  const [list, setList] = useState<Address[]>(() => load<Address[]>(LS.addresses, []));
  const [editing, setEditing] = useState<Address | null>(null);

  const persist = (next: Address[]) => { 
    setList(next); 
    save(LS.addresses, next); 
    if (onPersist) onPersist(next);
  };

  const emptyAddress = (): Address => ({
    id: uid(), label: "Casa", recipient: "", phone: "", zip: "",
    street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
    reference: "", isDefault: list.length === 0,
  }

  const saveAddress = (a: Address) => {
    let next = list.find(x => x.id === a.id) ? list.map(x => x.id === a.id ? a : x) : [...list, a];
    if (a.isDefault) next = next.map(x => ({ ...x, isDefault: x.id === a.id }));
    persist(next);
    setEditing(null);
    showToast("Endereço salvo");
  };

  const remove = (id: string) => {
    if (!confirm("Remover este endereço?")) return;
    persist(list.filter(x => x.id !== id));
  };

  const setDefault = (id: string) => {
    persist(list.map(x => ({ ...x, isDefault: x.id === id })));
  };

  if (editing) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/10 sticky top-0 bg-[#2968c8] z-10">
          <button onClick={() => setEditing(null)} className="text-cyan-400 text-sm">‹ Voltar</button>
          <h3 className="font-bold text-base flex items-center gap-2"><MapPin size={18} className="text-cyan-400" /> Endereço</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Identificação (ex: Casa, Trabalho)</label>
            <input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })}
              className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Destinatário</label>
              <input value={editing.recipient} onChange={e => setEditing({ ...editing, recipient: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Telefone</label>
              <input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">CEP</label>
              <input value={editing.zip} onChange={e => setEditing({ ...editing, zip: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Rua / Avenida</label>
              <input value={editing.street} onChange={e => setEditing({ ...editing, street: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Número</label>
              <input value={editing.number} onChange={e => setEditing({ ...editing, number: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Complemento</label>
              <input value={editing.complement} onChange={e => setEditing({ ...editing, complement: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Bairro</label>
              <input value={editing.neighborhood} onChange={e => setEditing({ ...editing, neighborhood: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Cidade</label>
              <input value={editing.city} onChange={e => setEditing({ ...editing, city: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">UF</label>
              <input maxLength={2} value={editing.state} onChange={e => setEditing({ ...editing, state: e.target.value.toUpperCase() })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 mb-1 block">Ponto de referência</label>
              <input value={editing.reference} onChange={e => setEditing({ ...editing, reference: e.target.value })}
                className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg p-2.5 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!editing.isDefault}
              onChange={e => setEditing({ ...editing, isDefault: e.target.checked })} />
            Usar como endereço padrão
          </label>
          <button onClick={() => saveAddress(editing)}
            className="w-full py-2.5 rounded-lg bg-cyan-500 text-[#2968c8] font-semibold text-sm">
            Salvar endereço
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title="Meus endereços" onClose={onClose} icon={MapPin} />
      <div className="p-4 space-y-3">
        {list.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">Você ainda não cadastrou nenhum endereço.</p>
        )}
        {list.map(a => (
          <div key={a.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <MapPin size={16} className="text-cyan-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{a.label}</p>
                  {a.isDefault && <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">Padrão</span>}
                </div>
                <p className="text-xs text-slate-300">{a.recipient} · {a.phone}</p>
                <p className="text-xs text-slate-400 mt-1">{a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ""}</p>
                <p className="text-xs text-slate-400">{a.neighborhood}, {a.city}/{a.state} · {a.zip}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditing(a)} className="flex-1 text-xs py-1.5 rounded border border-cyan-500/30 text-cyan-300">Editar</button>
              {!a.isDefault && (
                <button onClick={() => setDefault(a.id)} className="flex-1 text-xs py-1.5 rounded border border-emerald-500/30 text-emerald-300">Tornar padrão</button>
              )}
              <button onClick={() => remove(a.id)} className="text-xs py-1.5 px-3 rounded border border-red-500/30 text-red-300">Excluir</button>
            </div>
          </div>
        ))}
        <button onClick={() => setEditing(emptyAddress())}
          className="w-full py-2.5 rounded-lg bg-cyan-500 text-[#2968c8] font-semibold text-sm flex items-center justify-center gap-2">
          <Plus size={16} /> Adicionar novo endereço
        </button>
      </div>
    </ModalShell>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title="Sobre nós" onClose={onClose} icon={Star} />
      <div className="p-4 space-y-4 text-sm text-slate-300 leading-relaxed">
        <div className="flex justify-center mb-2">
          <img src={logo} alt="Grupo GF" className="h-16 w-16 rounded-xl object-contain bg-white/5 p-1" />
        </div>
        <h4 className="text-center font-bold text-cyan-400">GRUPO GF REDE VAREJISTA</h4>
        <p>
          O Grupo GF nasceu de um sonho simples e poderoso: oferecer produtos de qualidade,
          preço justo e atendimento humano para famílias de todo o Brasil. A história começou
          com uma família trabalhadora que acreditava que economia e qualidade podem caminhar
          juntas — e transformou esse propósito em um pequeno comércio, feito com muito esforço,
          atenção aos detalhes e atendimento olho no olho.
        </p>
        <p>
          A cada cliente conquistado, a confiança cresceu. O que começou pequeno se tornou uma
          rede varejista digital que hoje atende milhares de famílias em <span className="text-cyan-300 font-semibold">todo o território nacional</span>,
          com alimentos, bebidas, limpeza, higiene, eletrônicos, moda e muito mais — sempre com
          o mesmo cuidado dos primeiros dias.
        </p>
        <p>
          Em 2026 lançamos nosso aplicativo oficial para levar essa experiência para a palma da
          sua mão: comprar do sofá, falar com a gente pelo WhatsApp, acompanhar pedidos em tempo
          real e receber em casa, em qualquer canto do Brasil, com agilidade e segurança.
        </p>
        <p>
          Nossa missão continua a mesma desde o primeiro dia: <span className="text-cyan-300 font-semibold">facilitar
          o dia a dia das famílias brasileiras com produtos de qualidade, economia de verdade e
          atendimento próximo, em todo o Brasil.</span>
        </p>

        <div className="pt-2 border-t border-cyan-500/10 text-xs text-slate-400 space-y-1">
          <p><span className="text-slate-500">Razão Social:</span> Grupo GF Rede Varejista</p>
          <p><span className="text-slate-500">CNPJ:</span> 55.844.536/0001-85</p>
          <p><span className="text-slate-500">Responsável:</span> Ezequiel de Farias Carvalho</p>
        </div>
      </div>
    </ModalShell>
  );
}

function DeleteAccountModal({ user, onClose }: { user: UserData; onClose: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remove = async () => {
    setErr(null);
    if (confirmText.trim().toUpperCase() !== "EXCLUIR") {
      setErr("Digite EXCLUIR para confirmar.");
      return;
    }
    setBusy(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.removeItem(LS.user);
      localStorage.removeItem(LS.addresses);
      localStorage.removeItem(LS.cart);
      localStorage.removeItem(LS.orders);
    } catch {}
    window.location.href = "/auth";
  };

  return (
    <ModalShell onClose={onClose}>
      <ModalHeader title="Excluir conta" onClose={onClose} icon={Trash2} />
      <div className="p-4 space-y-3">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-200">
          <p className="font-semibold mb-1">Atenção: esta ação é permanente.</p>
          <p>Ao excluir sua conta <b>{user.email}</b>, seus dados, endereços, favoritos e histórico
          de pedidos locais serão removidos. Para apagar dados de pagamento ou anteriores ao app,
          fale com a gente pelo WhatsApp.</p>
        </div>
        <label className="text-xs text-slate-400 block">
          Digite <span className="text-red-300 font-semibold">EXCLUIR</span> para confirmar:
        </label>
        <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
          placeholder="EXCLUIR"
          className="w-full bg-[#2968c8] border border-red-500/30 rounded-lg p-2.5 text-sm" />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-cyan-500/30 text-cyan-200 text-sm">
            Cancelar
          </button>
          <button onClick={remove} disabled={busy}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white font-semibold text-sm disabled:opacity-50">
            {busy ? "Excluindo..." : "Excluir conta"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Stat({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3 text-center">
      <p className="text-base font-bold" style={{ color }}>{val}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}


/* ---------- Admin Panel ---------- */
function AdminPanel(props: {
  products: Product[]; setProducts: (p: Product[]) => void;
  banners: Banner[]; setBanners: (b: Banner[]) => void;
  coupons: Coupon[]; setCoupons: (c: Coupon[]) => void;
  orders: Order[]; setOrders: (o: Order[]) => void;
  settings: StoreSettings; setSettings: (s: StoreSettings) => void;
  editingProduct: Product | null; setEditingProduct: (p: Product | null) => void;
  showToast: (m: string) => void;
}) {
  const { products, setProducts, banners, setBanners, coupons, setCoupons, orders, setOrders, settings, setSettings, editingProduct, setEditingProduct, showToast } = props;
  const [section, setSection] = useState<"products" | "banners" | "coupons" | "orders" | "cashback" | "settings">("products");

  return (
    <div className="px-4 pt-4">
      <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><Shield size={20} className="text-cyan-400" /> Administração</h2>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {[
          { k: "products", label: "Produtos", icon: Package },
          { k: "banners", label: "Banners", icon: ImageIcon },
          { k: "coupons", label: "Cupons", icon: Tag },
          { k: "orders", label: "Pedidos", icon: ClipboardList },
          { k: "cashback", label: "Cashback", icon: Gift },
          { k: "settings", label: "Config.", icon: Edit },
        ].map(b => (
          <button key={b.k} onClick={() => setSection(b.k as any)}
            className={`p-2 rounded-xl text-center border ${section === b.k ? "bg-blue-600 border-blue-600 text-white" : "bg-[#2968c8] border-cyan-500/10 text-slate-300"}`}>
            <b.icon size={18} className="mx-auto mb-1" />
            <span className="text-[10px]">{b.label}</span>
          </button>
        ))}
      </div>

      {section === "products" && (
        <ProductsAdmin products={products} setProducts={setProducts} editing={editingProduct} setEditing={setEditingProduct} showToast={showToast} />
      )}
      {section === "banners" && (
        <BannersAdmin banners={banners} setBanners={setBanners} showToast={showToast} />
      )}
      {section === "coupons" && (
        <CouponsAdmin coupons={coupons} setCoupons={setCoupons} showToast={showToast} />
      )}
      {section === "orders" && (
        <OrdersAdmin orders={orders} setOrders={setOrders} />
      )}
      {section === "cashback" && (
        <CashbackAdmin showToast={showToast} />
      )}
      {section === "settings" && (
        <SettingsAdmin settings={settings} setSettings={setSettings} showToast={showToast} />
      )}
    </div>
  );
}


function SettingsAdmin({ settings, setSettings, showToast }: {
  settings: StoreSettings; setSettings: (s: StoreSettings) => void; showToast: (m: string) => void;
}) {
  const [form, setForm] = useState<StoreSettings>(settings);
  const upd = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setForm({ ...form, [k]: v }
  const fields: { k: keyof StoreSettings; label: string; type?: string }[] = [
    { k: "storeName", label: "Nome da loja" },
    { k: "cnpj", label: "CNPJ" },
    { k: "owner", label: "Responsável" },
    { k: "whatsapp", label: "WhatsApp (com DDI, ex: 5542998722699)" },
    { k: "email", label: "E-mail" },
    { k: "address", label: "Endereço completo" },
    { k: "instagram", label: "Instagram (@usuario)" },
    { k: "deliveryFee", label: "Taxa de entrega (R$)", type: "number" },
    { k: "minOrder", label: "Pedido mínimo atacado (R$) — aplicado a lojistas", type: "number" },
  ];
  return (
    <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4 space-y-3">
      <p className="font-semibold text-cyan-400">Configurações da loja</p>
      {fields.map(f => (
        <div key={f.k}>
          <label className="block text-xs text-slate-400 mb-1">{f.label}</label>
          <input
            type={f.type || "text"}
            value={String(form[f.k] ?? "")}
            onChange={e => upd(f.k, (f.type === "number" ? Number(e.target.value) : e.target.value) as any)}
            className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      ))}
      <button onClick={() => { setSettings(form); showToast("Configurações salvas"); }}
        className="w-full py-2.5 rounded-lg font-semibold text-white"
        style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
        Salvar configurações
      </button>
    </div>
  );
}

function ProductsAdmin({ products, setProducts, editing, setEditing, showToast }: {
  products: Product[]; setProducts: (p: Product[]) => void;
  editing: Product | null; setEditing: (p: Product | null) => void;
  showToast: (m: string) => void;
}) {
  const blank = (): Product => ({ id: uid(), name: "", price: 0, category: "", image: "", stock: 0, description: "" }
  const [form, setForm] = useState<Product>(blank());
  const [adminSearch, setAdminSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const visibleProducts = useMemo(() => {
    const q = adminSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.subcategory || "").toLowerCase().includes(q),
    );
  }, [products, adminSearch]);


  useEffect(() => { if (editing) setForm(editing); }, [editing]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { showToast("Imagem muito grande (max 2MB)"); return; }
    const data = await fileToDataUrl(f);
    setForm({ ...form, image: data }
  };

  const save = () => {
    if (!form.name || !form.price || !form.category) { showToast("Preencha nome, preço e categoria"); return; }
    if (!form.image) { showToast("Adicione uma foto"); return; }
    const exists = products.find(p => p.id === form.id);
    setProducts(exists ? products.map(p => p.id === form.id ? form : p) : [form, ...products]);
    showToast(exists ? "Produto atualizado" : "Produto adicionado");
    setForm(blank()); setEditing(null);
  };

  const remove = (id: string) => {
    if (!confirm("Excluir produto?")) return;
    setProducts(products.filter(p => p.id !== id));
    showToast("Produto removido");
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4">
        <p className="font-semibold mb-3 text-cyan-400">{editing ? "Editar produto" : "Novo produto"}</p>
        <div className="space-y-2">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Nome do produto" className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" value={form.price || ""} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              placeholder="Preço" className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
            <input type="number" step="0.01" value={form.oldPrice || ""} onChange={e => setForm({ ...form, oldPrice: parseFloat(e.target.value) || undefined })}
              placeholder="Preço antigo (opcional)" className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value, subcategory: "" })}
              className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400">
              <option value="">Selecione a categoria</option>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={form.subcategory || ""}
              onChange={e => setForm({ ...form, subcategory: e.target.value })}
              disabled={!form.category || !CATEGORIES_TREE[form.category]}
              className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50">
              <option value="">Subcategoria</option>
              {(CATEGORIES_TREE[form.category] || []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <input type="number" value={form.stock || ""} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
            placeholder="Estoque" className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
          <textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição" rows={2} className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-2.5 rounded-lg border-2 border-dashed border-cyan-500/40 text-sm flex items-center justify-center gap-2 hover:border-cyan-400">
            <Upload size={16} /> {form.image ? "Trocar foto" : "Enviar foto do produto"}
          </button>
          {form.image && <img src={form.image} alt="" className="w-full h-32 object-cover rounded-lg" />}

          <div className="flex gap-2">
            <button onClick={save} className="flex-1 py-2.5 rounded-lg font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
              {editing ? "Salvar alterações" : "Adicionar produto"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(null); setForm(blank()); }}
                className="px-4 py-2.5 rounded-lg border border-cyan-500/30">Cancelar</button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-cyan-400">
            Produtos cadastrados ({visibleProducts.length}{adminSearch ? ` de ${products.length}` : ""})
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)}
            placeholder="Pesquisar produto por nome, categoria..."
            className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg pl-8 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-400" />
        </div>
        {visibleProducts.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nenhum produto encontrado para "{adminSearch}".</p>
        )}
        {visibleProducts.map(p => (
          <div key={p.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3 flex gap-3 items-center">
            <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{p.name}</p>
              <p className="text-xs text-slate-400">{p.category}{p.subcategory ? ` › ${p.subcategory}` : ""} · {brl(p.price)} · estoque {p.stock}</p>
            </div>
            <button onClick={() => setEditing(p)} className="p-2 text-cyan-400"><Edit size={16} /></button>
            <button onClick={() => remove(p.id)} className="p-2 text-red-400"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

    </div>
  );
}

function BannersAdmin({ banners, setBanners, showToast }: { banners: Banner[]; setBanners: (b: Banner[]) => void; showToast: (m: string) => void }) {
  const [form, setForm] = useState<Banner>({ id: uid(), title: "", subtitle: "", image: "" }
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { showToast("Imagem muito grande"); return; }
    setForm({ ...form, image: await fileToDataUrl(f) }
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4 space-y-2">
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Título" className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
        <input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtítulo" className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} className="w-full py-2.5 rounded-lg border-2 border-dashed border-cyan-500/40 text-sm flex items-center justify-center gap-2">
          <Upload size={16} /> {form.image ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {form.image && <img src={form.image} alt="" className="w-full h-24 object-cover rounded-lg" />}
        <button onClick={() => {
          if (!form.title || !form.image) { showToast("Preencha tudo"); return; }
          setBanners([form, ...banners]); setForm({ id: uid(), title: "", subtitle: "", image: "" }
          showToast("Banner adicionado");
        }} className="w-full py-2.5 rounded-lg font-semibold text-white" style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
          Adicionar banner
        </button>
      </div>
      {banners.map(b => (
        <div key={b.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3 flex gap-3 items-center">
          <img src={b.image} alt="" className="w-16 h-12 rounded object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{b.title}</p>
            <p className="text-xs text-slate-400 truncate">{b.subtitle}</p>
          </div>
          <button onClick={() => { setBanners(banners.filter(x => x.id !== b.id)); showToast("Removido"); }} className="p-2 text-red-400"><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}

function CouponsAdmin({ coupons, setCoupons, showToast }: { coupons: Coupon[]; setCoupons: (c: Coupon[]) => void; showToast: (m: string) => void }) {
  const [code, setCode] = useState(""); const [disc, setDisc] = useState(""); const [type, setType] = useState<"percent" | "fixed">("percent");

  return (
    <div className="space-y-3">
      <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4 space-y-2">
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Código (ex: NATAL15)" className="w-full bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={disc} onChange={e => setDisc(e.target.value)} placeholder="Desconto" className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400" />
          <select value={type} onChange={e => setType(e.target.value as any)} className="bg-[#2968c8] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-400">
            <option value="percent">% Percentual</option>
            <option value="fixed">R$ Fixo</option>
          </select>
        </div>
        <button onClick={() => {
          const d = parseFloat(disc);
          if (!code || !d) { showToast("Preencha tudo"); return; }
          setCoupons([{ code, discount: d, type }, ...coupons.filter(c => c.code !== code)]);
          setCode(""); setDisc("");
          showToast("Cupom salvo");
        }} className="w-full py-2.5 rounded-lg font-semibold text-white" style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
          Adicionar cupom
        </button>
      </div>
      {coupons.map(c => (
        <div key={c.code} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3 flex items-center gap-3">
          <Tag size={18} className="text-cyan-400" />
          <div className="flex-1">
            <p className="font-bold text-sm">{c.code}</p>
            <p className="text-xs text-slate-400">{c.type === "percent" ? `${c.discount}% OFF` : `${brl(c.discount)} OFF`}</p>
          </div>
          <button onClick={() => setCoupons(coupons.filter(x => x.code !== c.code))} className="p-2 text-red-400"><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}

function OrdersAdmin({ orders, setOrders }: { orders: Order[]; setOrders: (o: Order[]) => void }) {
  if (orders.length === 0) return <p className="text-center text-sm text-slate-400 py-8">Nenhum pedido ainda.</p>;
  const cycle = (s: Order["status"]): Order["status"] => s === "Pendente" ? "Confirmado" : s === "Confirmado" ? "Entregue" : "Pendente";
  return (
    <div className="space-y-3">
      {orders.map(o => (
        <div key={o.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-slate-400">#{o.id.toUpperCase()}</p>
              <p className="text-xs text-slate-400">{o.date}</p>
            </div>
            <button onClick={() => setOrders(orders.map(x => x.id === o.id ? { ...x, status: cycle(x.status) } : x))}
              className={`text-xs px-3 py-1 rounded-full font-semibold ${
                o.status === "Entregue" ? "bg-emerald-500/20 text-emerald-300"
                : o.status === "Confirmado" ? "bg-blue-500/20 text-blue-300"
                : "bg-amber-500/20 text-amber-300"
              }`}>{o.status} ↻</button>
          </div>
          {o.items.map((it, idx) => (
            <p key={idx} className="text-sm">{it.qty}x {it.name}</p>
          ))}
          <p className="font-bold text-cyan-400 mt-2">{brl(o.total)}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Copy Code Modal ---------- */
function CopyCodeModal({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.origin : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); showToast("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch { showToast("Não foi possível copiar"); }
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#2968c8] rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2"><Copy size={20} className="text-cyan-400" /> Compartilhar o site</h3>
          <button onClick={onClose} className="p-1"><X size={20} /></button>
        </div>
        <p className="text-sm text-slate-300 mb-3">Copie o link abaixo para compartilhar o site:</p>
        <div className="bg-[#2968c8] border border-cyan-500/20 rounded-lg p-3 break-all text-xs text-cyan-300 font-mono mb-3">
          {url}
        </div>
        <button onClick={copy}
          className="w-full py-2.5 rounded-lg font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#0a4fe3,#ff6a00)" }}>
          {copied ? <><Check size={18} /> Copiado</> : <><Copy size={18} /> Copiar link</>}
        </button>
        <p className="text-xs text-slate-400 mt-4">
          Para baixar o código-fonte completo, peça ao desenvolvedor responsável o pacote do projeto.
        </p>
      </div>
    </div>
  );
}

/* ---------- Favorites tab ---------- */
function FavoritesTab({ user, products, onOpen, onToggle }: {
  user: UserData; products: Product[]; onOpen: (p: Product) => void; onToggle: (id: string) => void;
}) {
  const favs = products.filter(p => user.favorites.includes(p.id));
  return (
    <div className="px-4 pt-4">
      <h2 className="font-bold text-xl mb-3 flex items-center gap-2"><Heart size={20} className="text-red-400" /> Meus Favoritos</h2>
      {favs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          Nenhum favorito ainda. Toque no <Heart size={14} className="inline -mt-1" /> em qualquer produto para salvar aqui.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {favs.map(p => (
            <div key={p.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl overflow-hidden">
              <button onClick={() => onOpen(p)} className="block w-full">
                <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" />
              </button>
              <div className="p-2.5 space-y-1.5">
                <p className="text-xs font-semibold line-clamp-2 min-h-[2.2em]">{p.name}</p>
                <p className="text-sm font-bold text-cyan-400">{brl(p.price)}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => onOpen(p)} className="flex-1 text-[11px] py-1.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Ver</button>
                  <button onClick={() => onToggle(p.id)} className="px-2 py-1.5 rounded bg-red-500/15 text-red-300 border border-red-500/30">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Notifications tab ---------- */
function NotificationsTab({ items, onMarkRead, onMarkAll }: {
  items: any[]; onMarkRead: (id: string) => void; onMarkAll: () => void;
}) {
  const iconFor = (kind: string) => {
    if (kind.includes("payment")) return <CreditCard size={18} className="text-emerald-400" />;
    if (kind.includes("cashback")) return <Gift size={18} className="text-cyan-300" />;
    if (kind.includes("order")) return <Package size={18} className="text-blue-300" />;
    if (kind.includes("coupon")) return <Tag size={18} className="text-amber-300" />;
    return <BellRing size={18} className="text-cyan-300" />;
  };
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-xl flex items-center gap-2"><Bell size={20} className="text-cyan-400" /> Notificações</h2>
        {items.some(i => !i.read) && (
          <button onClick={onMarkAll} className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">
            Marcar todas como lidas
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          Sem notificações por enquanto. Você verá aqui avisos de pagamentos, cupons e cashback.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(n => (
            <button key={n.id} onClick={() => !n.read && onMarkRead(n.id)}
              className={`w-full text-left rounded-xl p-3 border flex gap-3 ${n.read ? "bg-[#2968c8] border-cyan-500/10 opacity-70" : "bg-[#2968c8] border-cyan-500/30"}`}>
              <div className="shrink-0 mt-0.5">{iconFor(n.kind)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="text-xs text-slate-300 mt-0.5">{n.body}</p>}
                <p className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Cashback tab ---------- */
function CashbackTab({ data, onGoCart }: {
  data: { available: number; totalEarned: number; totalUsed: number; totalExpired: number; credits: any[] };
  onGoCart: () => void;
}) {
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");
  const daysLeft = (s: string) => Math.max(0, Math.ceil((new Date(s).getTime() - Date.now()) / 86400000));
  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg,#0a4fe3,#22d3ee)" }}>
        <div className="flex items-center gap-2 text-sm opacity-90"><Gift size={18} /> Saldo de cashback</div>
        <p className="text-3xl font-bold mt-1">{brl(data.available)}</p>
        <p className="text-xs opacity-90 mt-1">disponível para usar em compras</p>
        <button onClick={onGoCart} className="mt-3 px-4 py-2 rounded-lg bg-white text-blue-700 font-semibold text-sm">
          Usar no carrinho
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 leading-relaxed">
        <p className="font-semibold flex items-center gap-1.5 mb-1"><Calendar size={14} /> Como funciona</p>
        <p>A cada compra com pagamento <b>confirmado</b>, você ganha <b>10% de cashback</b>. O valor pode ser usado em <b>novas compras</b> dentro de <b>30 dias</b>. Após esse prazo, o saldo expira e é transferido para a conta bancária da loja.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Ganho total" val={brl(data.totalEarned)} color="#10b981" />
        <Stat label="Usado" val={brl(data.totalUsed)} color="#3b82f6" />
        <Stat label="Expirado" val={brl(data.totalExpired)} color="#ef4444" />
      </div>

      <div>
        <p className="text-sm font-semibold text-cyan-300 mb-2">Histórico de créditos</p>
        {data.credits.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Nenhum cashback ainda. Faça sua primeira compra para começar.</p>
        ) : (
          <div className="space-y-2">
            {data.credits.map(c => {
              const remaining = Number(c.amount) - Number(c.used_amount);
              const colors = c.status === "active" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : c.status === "used" ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : c.status === "expired" ? "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-slate-500/10 border-slate-500/30 text-slate-300";
              const label = c.status === "active" ? `Ativo · expira em ${daysLeft(c.expires_at)} dias`
                : c.status === "used" ? "Usado"
                : c.status === "expired" ? "Expirado"
                : "Transferido";
              return (
                <div key={c.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-white">{brl(remaining > 0 ? remaining : Number(c.amount))}</p>
                      <p className="text-[11px] text-slate-400">criado em {fmtDate(c.created_at)} · validade {fmtDate(c.expires_at)}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${colors}`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Admin: Cashback report ---------- */
function CashbackAdmin({ showToast }: { showToast: (m: string) => void }) {
  const fetchReport = useServerFn(adminCashbackReport);
  const markTransferred = useServerFn(adminMarkExpiredTransferred);
  const [report, setReport] = useState<{ credits: any[]; totals: { issued: number; used: number; active: number; expired: number; transferred: number } } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await fetchReport({} setReport(r as any); }
    catch (e: any) { showToast(e?.message || "Erro ao carregar"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-3">
      <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-cyan-400 flex items-center gap-2"><Gift size={16} /> Relatório de Cashback</p>
          <button onClick={load} disabled={loading} className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50">
            {loading ? "..." : "Atualizar"}
          </button>
        </div>
        {report ? (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Emitido" val={brl(report.totals.issued)} color="#10b981" />
            <Stat label="Usado" val={brl(report.totals.used)} color="#3b82f6" />
            <Stat label="Ativo" val={brl(report.totals.active)} color="#06b6d4" />
            <Stat label="Expirado" val={brl(report.totals.expired)} color="#ef4444" />
            <div className="col-span-2">
              <Stat label="Transferido" val={brl(report.totals.transferred)} color="#a78bfa" />
            </div>
          </div>
        ) : <p className="text-xs text-slate-400">Carregando...</p>}
      </div>

      {report && report.totals.expired > 0 && (
        <button
          onClick={async () => {
            if (!confirm(`Marcar ${brl(report.totals.expired)} de cashback expirado como transferido para a conta bancária?`)) return;
            try { await markTransferred({} showToast("Marcado como transferido"); load(); }
            catch (e: any) { showToast(e?.message || "Erro"); }
          }}
          className="w-full py-2.5 rounded-lg bg-amber-600 text-white font-semibold text-sm"
        >
          Marcar expirados como transferidos
        </button>
      )}

      <div>
        <p className="text-sm font-semibold text-cyan-300 mb-2">Últimos créditos</p>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {report?.credits.slice(0, 50).map(c => (
            <div key={c.id} className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-white font-bold">{brl(Number(c.amount))}</span>
                <span className="text-slate-400">{c.status}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">user {String(c.user_id).slice(0, 8)} · expira {fmtDate(c.expires_at)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LojasParceirasStrip({ partners }: { partners: any[] }) {
  if (!partners.length) return null;
  return (
    <section id="lojas-parceiras" className="mb-5 scroll-mt-20">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-base">Lojas Parceiras GF</h2>
        <span className="text-[11px] text-slate-400">{partners.length} {partners.length === 1 ? "loja" : "lojas"}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {partners.map((p) => (
          <Link key={p.id} to={`/loja/${p.slug}`} className="shrink-0 w-32 rounded-lg bg-[#2968c8] border border-cyan-500/20 overflow-hidden hover:border-cyan-400">
            <div className="w-full h-24 bg-cyan-500/10" style={p.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
            <div className="p-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#2968c8] overflow-hidden shrink-0">
                {p.logo_url && <img src={p.logo_url} alt={p.nome_loja} className="h-full w-full object-cover" />}
              </div>
              <span className="text-[11px] font-semibold text-slate-100 line-clamp-2">{p.nome_loja}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------- Pedidos com rastreamento ---------- */
const REMOTE_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Pago",
  preparing: "Preparando Envio",
  shipped: "Em Transporte",
  out_for_delivery: "Saiu para Entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

function RemoteOrderCard({ order }: { order: any }) {
  const step = STATUS_TO_STEP[order.status] ?? 0;
  const cancelled = order.status === "cancelled";
  const items = Array.isArray(order.items) ? order.items : [];
  const dates: (string | null)[] = [null, null, null, null, null, null];
  dates[0] = order.created_at ?? null;
  if (step >= 1) dates[1] = order.paid_at ?? (step === 1 ? order.updated_at : null);
  if (step >= 2) dates[step] = order.updated_at ?? null;
  return (
    <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs text-slate-400">#{String(order.id).slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-slate-400">{order.created_at ? new Date(order.created_at).toLocaleString("pt-BR") : ""}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          cancelled ? "bg-red-500/20 text-red-300"
          : order.status === "delivered" ? "bg-emerald-500/20 text-emerald-300"
          : step >= 1 ? "bg-blue-500/20 text-blue-300"
          : "bg-amber-500/20 text-amber-300"
        }`}>{REMOTE_STATUS_LABEL[order.status] ?? order.status}</span>
      </div>
      <div className="space-y-1 mb-2">
        {items.map((it: any, idx: number) => (
          <p key={idx} className="text-sm">{it.qty}x {it.name} — <span className="text-slate-400">{brl(Number(it.price) * Number(it.qty))}</span></p>
        ))}
      </div>
      <p className="font-bold text-cyan-400">Total: {brl(Number(order.total))}</p>
      <OrderTrackingTimeline
        step={step}
        cancelled={cancelled}
        dates={dates}
        trackingCode={trackingCodeFromId(String(order.id))}
      />
      {!cancelled && (
        <a
          href={`/disputa/abrir/${order.id}`}
          className="mt-3 inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"
        >
          🛡️ Abrir Disputa
        </a>
      )}
    </div>
  );
}

function LocalOrderCard({ order }: { order: Order }) {
  const step = order.status === "Entregue" ? 5 : order.status === "Confirmado" ? 1 : 0;
  const h = order.history ?? {};
  const dates: (string | null)[] = [
    h.received ?? order.date ?? null,
    h.payment ?? null,
    h.preparing ?? null,
    h.transit ?? null,
    h.out ?? null,
    h.delivered ?? null,
  ];
  return (
    <div className="bg-[#2968c8] border border-cyan-500/10 rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs text-slate-400">#{order.id.toUpperCase()}</p>
          <p className="text-xs text-slate-400">{order.date}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          order.status === "Entregue" ? "bg-emerald-500/20 text-emerald-300"
          : order.status === "Confirmado" ? "bg-blue-500/20 text-blue-300"
          : "bg-amber-500/20 text-amber-300"
        }`}>{order.status}</span>
      </div>
      <div className="space-y-1 mb-2">
        {order.items.map((it, idx) => (
          <p key={idx} className="text-sm">{it.qty}x {it.name} — <span className="text-slate-400">{brl(it.price * it.qty)}</span></p>
        ))}
      </div>
      <p className="font-bold text-cyan-400">Total: {brl(order.total)}</p>
      <OrderTrackingTimeline
        step={step}
        dates={dates}
        trackingCode={order.tracking ?? trackingCodeFromId(order.id)}
      />
    </div>
  );
}