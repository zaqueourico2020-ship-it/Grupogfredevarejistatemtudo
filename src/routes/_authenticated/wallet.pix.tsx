
export const Route = createFileRoute("/_authenticated/wallet/pix")({
  beforeLoad: () => {
    throw redirect({ to: "/carteira", hash: "deposit" });
  },
});
