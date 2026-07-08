
export const Route = createFileRoute("/_authenticated/wallet")({
  beforeLoad: () => {
    throw redirect({ to: "/carteira" });
  },
});
