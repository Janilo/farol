"""Confere a porta `tier.ts` contra o motor Python que ela espelha.

Existe versionado porque o ROADMAP e a AUDITORIA afirmam "2268 casos, 100% de
paridade" — e afirmação que ninguém consegue reproduzir vale menos do que
parece. A primeira versão deste script viveu no scratchpad e teria sumido com a
sessão, deixando o número órfão.

Ele NÃO roda no CI: depende do `fechar_ciclo.py` da esteira, que vive fora deste
repo (`~/Documents/Trabalho/Clientes/Leads/`). É ferramenta de verificação manual,
para rodar quando a rubrica mudar de qualquer um dos dois lados.

O alarme do dia a dia é outro e está no repo: `tier.test.ts` espelha as
constantes de urgência do Python e quebra se um lado mudar sozinho.

Uso:
    python3 scripts/paridade-tier.py > /tmp/py.json
    # depois, no vitest, comparar com computePreTier sobre as mesmas entradas
"""

import importlib.util
import json
import pathlib
import sys

ESTEIRA = pathlib.Path.home() / "Documents/Trabalho/Clientes/Leads"

if not (ESTEIRA / "fechar_ciclo.py").exists():
    sys.exit(f"esteira não encontrada em {ESTEIRA} — este script depende dela")

# `sys.path` antes do import: o fechar_ciclo importa `notion_notas` como módulo
# irmão, e sem isto o import estoura com ModuleNotFoundError.
sys.path.insert(0, str(ESTEIRA))
spec = importlib.util.spec_from_file_location("fechar_ciclo", ESTEIRA / "fechar_ciclo.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

SETORES = ["Fintech", "Healthtech", "DTC", "CPG", "SaaS", "Govtech", "Logtech", "Outro", ""]
PORTES = ["Early", "Scale-up", "Grande", ""]
GATILHOS = [f"G{i}" for i in range(1, 20)] + ["", "G99"]
TRECHOS = ["", "captou R$ 2,5 milhões em rodada seed", "captou R$ 50 milhões em Série B"]

out = []
for setor in SETORES:
    for porte in PORTES:
        for gatilho in GATILHOS:
            for trecho in TRECHOS:
                sinal = {"setor": setor, "porte": porte, "gatilho": gatilho, "trecho": trecho}
                score, tier, _ = mod.compute_pre_tier(sinal)
                out.append({**sinal, "score": score, "tier": tier})

json.dump(out, sys.stdout)
print(f"\n{len(out)} casos gerados", file=sys.stderr)
