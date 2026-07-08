
export const Route = createFileRoute("/_authenticated/wallet/transactions")({
  beforeLoad: () => {
    throw redirect({ to: "/carteira", hash: "extrato" });
  },
});
