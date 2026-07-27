/**
 * CNPJ — núcleo puro, sem I/O.
 *
 * Validar antes de sair da máquina é o primeiro filtro de quota: CNPJ com
 * dígito verificador errado nunca vira chamada à fonte pública.
 */

/** Só os dígitos. A máscara é da tela; o schema e o código guardam limpo. */
export function cleanCnpj(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

/**
 * Dígitos verificadores (módulo 11). Rejeita também os 14 repetidos
 * (`00000000000000`, `11111111111111`, …), que passam na conta mas não existem.
 */
export function isValidCnpj(raw: string): boolean {
  const d = cleanCnpj(raw);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const digito = (base: string, pesos: number[]): number => {
    const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const dv1 = digito(d.slice(0, 12), p1);
  if (dv1 !== Number(d[12])) return false;
  return digito(d.slice(0, 13), p2) === Number(d[13]);
}

/** `12345678000190` → `12.345.678/0001-90`. Entrada inválida volta como veio. */
export function formatCnpj(raw: string): string {
  const d = cleanCnpj(raw);
  if (d.length !== 14) return raw;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Um palpite sobre a intenção do usuário: o campo aceita CNPJ ou nome.
 * Sete dígitos ou mais é tentativa de CNPJ, mesmo incompleta — assim
 * "12.345.678/0001-9" recebe erro de CNPJ inválido em vez de virar busca
 * por nome, que devolveria "não achei empresa com esse nome" e confundiria.
 */
export function looksLikeCnpj(raw: string): boolean {
  return cleanCnpj(raw).length >= 7;
}

/**
 * CNAE da Receita vem como INTEIRO no payload (`600001`), então o zero à
 * esquerda se perde: o CNAE da Petrobras é 06.00-0/01, não 60.00-0/1.
 * Preencher para 7 dígitos antes de formatar não é preciosismo.
 */
export function formatCnae(codigo: number | string | null | undefined): string | null {
  if (codigo === null || codigo === undefined || codigo === "") return null;
  const d = String(codigo).replace(/\D/g, "").padStart(7, "0");
  if (d.length !== 7) return null;
  return `${d.slice(0, 4)}-${d.slice(4, 5)}/${d.slice(5)}`;
}
