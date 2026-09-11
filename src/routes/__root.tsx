import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("business-control-error", { detail: error.message }));
  }, [error]);

  return (
    <div className="bc-admin-shell">
      <div className="bc-admin-card">
        <h1>Esta página não carregou</h1>
        <p>Algo inesperado aconteceu. Tente atualizar a página ou voltar para o início.</p>
        <button className="bc-button bc-button-primary" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Business Control | Sistemas sob medida para sua empresa" },
      { name: "description", content: "Descubra o controle que sua empresa realmente precisa. Diagnóstico e sistemas sob medida para MEI, pequenas e médias empresas." },
      { name: "author", content: "Business Control" },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Business Control | Controle que se adapta à sua empresa" },
      { property: "og:description", content: "Substitua planilhas e controles dispersos por um sistema modelado para sua operação." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>;
}
