
export const Route = createFileRoute("/_authenticated/parceiro/")({
  beforeLoad: () => { throw redirect({ to: "/parceiro/dashboard" as any }); },
  component: () => null,
});
