import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { FarolWordmark } from "@/components/brand/FarolWordmark";

const DESCRIPTION =
  "Como o Farol decide o que é prioridade: os quatro eixos da rubrica, por que o eixo de alcance pode subtrair, e o que a máquina não decide.";

export const Route = createFileRoute("/metodologia")({
  component: MetodologiaPage,
  head: () => ({
    meta: [
      { title: "Metodologia — Farol" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Metodologia — Farol" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://farol.pereirasaraiva.com/metodologia" },
      { property: "og:image", content: "/og-social.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-social.png" },
    ],
    links: [{ rel: "canonical", href: "https://farol.pereirasaraiva.com/metodologia" }],
  }),
});

/** Os quatro eixos, como aparecem na rubrica em `src/lib/tier.ts`. */
const AXES = [
  {
    nome: "Setor",
    peso: "+1",
    corpo:
      "Fintech, healthtech, e-commerce, SaaS B2B, govtech e boutique de pesquisa somam. Setor fora da lista não zera a conta, sinaliza que a leitura é sua.",
  },
  {
    nome: "Porte",
    peso: "+1",
    corpo:
      "Scale-up e grande somam, porque têm orçamento. Early não soma, e a razão aparece na tela: o tíquete de consultoria não cabe. O porte é você que informa, porque o cadastro da Receita não separa scale-up de grande: a faixa DEMAIS vale tanto para uma empresa de cinquenta pessoas quanto para a Ambev.",
  },
  {
    nome: "Gatilho",
    peso: "+2 ou +1",
    corpo:
      "O evento que cria urgência. Rodada, troca de C-level, governança, ex-cliente que mudou de empresa e intenção declarada valem dois. Aquisição, churn, lançamento e piloto de IA travado valem um.",
  },
  {
    nome: "Alcance do comprador",
    peso: "+1 ou −1",
    corpo: "Caminho quente soma. Empresa grande sem caminho quente subtrai, e trava o tier em C.",
  },
];

function MetodologiaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-6xl px-6 md:px-10 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-3" aria-label="Farol — início">
            <FarolWordmark height={26} />
            <span className="eyebrow">por J P Saraiva</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="flex-1 py-20">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <p className="eyebrow mb-8">METODOLOGIA</p>
          <h1 className="font-display text-5xl md:text-6xl text-foreground leading-[1.05] mb-14">
            Como o Farol decide o que é{" "}
            <em className="italic font-medium text-[var(--farol-beam)]">prioridade</em>.
          </h1>

          <section className="mb-16">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-display text-3xl text-[var(--farol-beam)]">01</span>
              <h2 className="text-2xl font-semibold text-foreground">Por que quatro eixos</h2>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              A rubrica saiu de doze projetos de consultoria, não de um framework de prateleira.
              Cada eixo existe porque separou, na prática, conta que fechou de conta que consumiu
              tempo: setor no alvo, porte com orçamento, gatilho ativo e comprador alcançável. Sem
              gatilho identificável e sem caminho quente, não é prioridade máxima, por melhor que
              seja o setor.
            </p>
          </section>

          <section className="mb-16">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-display text-3xl text-[var(--farol-beam)]">02</span>
              <h2 className="text-2xl font-semibold text-foreground">O que cada eixo pesa</h2>
            </div>
            <div className="space-y-5">
              {AXES.map((a) => (
                <div key={a.nome} className="border-l-2 border-border pl-5">
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {a.nome}{" "}
                    <span className="font-mono text-xs font-normal text-[var(--farol-beam)]">
                      {a.peso}
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a.corpo}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-display text-3xl text-[var(--farol-beam)]">03</span>
              <h2 className="text-2xl font-semibold text-foreground">
                Por que o eixo de alcance pode subtrair
              </h2>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              Esse é o eixo que mais gente estranha. Uma empresa de mil funcionários é ótima cliente
              para quem tem time comercial, e é praticamente inalcançável para um consultor solo sem
              porta de entrada: o centro de compra está a três camadas de distância. A rubrica foi
              calibrada para o segundo caso. Se você vende com time, esse eixo deveria somar, não
              subtrair, e o Farol mostra o cálculo justamente para você poder discordar dele.
            </p>
          </section>

          <section className="mb-16">
            <div className="flex items-baseline gap-4 mb-4">
              <span className="font-display text-3xl text-[var(--farol-beam)]">04</span>
              <h2 className="text-2xl font-semibold text-foreground">O que a máquina não decide</h2>
            </div>
            <p className="text-base text-muted-foreground leading-relaxed">
              O tier final. O Farol devolve um pré-tier, com &ldquo;parcial&rdquo; estampado quando
              não há gatilho observado, porque gatilho vem de notícia e de conversa, não de
              cadastro. Casar nome com CNPJ quando a empresa tem holding e três razões sociais
              também continua sendo trabalho humano. A ferramenta reduz a pesquisa, não substitui o
              julgamento.
            </p>
          </section>

          <div className="border-t border-border pt-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 md:px-10 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>Farol · {new Date().getFullYear()}</span>
          <span>Cadastro da Receita · tecnografia brasileira · priorização por rubrica</span>
        </div>
      </footer>
    </div>
  );
}
