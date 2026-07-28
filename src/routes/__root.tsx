import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-night px-6 text-center">
      <div className="max-w-md">
        <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.22em] text-beam">404</p>
        <h1 className="font-display text-[44px] font-medium italic leading-tight text-ink">
          Página não encontrada.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-mist">
          O link pode estar desatualizado ou a página foi movida.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/login"
            className="inline-flex items-center bg-beam px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-night-deep transition-opacity hover:opacity-85"
          >
            Entrar
          </Link>
          <a
            href="https://pereirasaraiva.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center border border-beam/30 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ink transition-opacity hover:opacity-85"
          >
            J P Saraiva
          </a>
          <Link
            to="/"
            className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.22em] text-fog hover:text-ink"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Farol · Ficha instantânea de empresas brasileiras" },
      {
        name: "description",
        content:
          "Ficha instantânea de empresas brasileiras: cadastro da Receita Federal, stack detectada no site e prioridade calculada por rubrica.",
      },
      { name: "author", content: "Pereira Saraiva" },
      { property: "og:site_name", content: "Farol" },
      { property: "og:title", content: "Farol · Ficha instantânea de empresas brasileiras" },
      {
        property: "og:description",
        content:
          "Ficha instantânea de empresas brasileiras: cadastro da Receita Federal, stack detectada no site e prioridade calculada por rubrica.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://farol.pereirasaraiva.com/" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Farol · Ficha instantânea de empresas brasileiras" },
      {
        name: "twitter:description",
        content:
          "Ficha instantânea de empresas brasileiras: cadastro da Receita Federal, stack detectada no site e prioridade calculada por rubrica.",
      },
      { property: "og:image", content: "https://farol.pereirasaraiva.com/og-social.png" },
      { name: "twitter:image", content: "https://farol.pereirasaraiva.com/og-social.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      // O .ico é o fallback de quem não faz SVG e o que o Windows usa na barra
      // de tarefas; declarado em vez de deixar o navegador adivinhar /favicon.ico.
      { rel: "icon", type: "image/x-icon", sizes: "16x16 32x32 48x48 64x64", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "canonical", href: "https://farol.pereirasaraiva.com/" },
      {
        rel: "preload",
        href: "/fonts/Fraunces.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/InterTight.ttf",
        as: "font",
        type: "font/ttf",
        crossOrigin: "anonymous",
      },
    ],
    scripts: [
      {
        type: "text/javascript",
        async: true,
        src: "https://www.googletagmanager.com/gtag/js?id=G-QDHKZ82GE0",
      },
      {
        type: "text/javascript",
        children: `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-QDHKZ82GE0');`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
