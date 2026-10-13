"""Atualiza front/data/trocas.json a partir do Fabric (disktrans_gold).

Uso (na raiz do repositório):
    python back/scripts/atualizar_base.py

Roda back/sql/base_trocas.sql pelo conector da skill especialista-de-dados (somente leitura,
login SSO em cache) e grava um JSON compacto, sem dados de clientes, para o dashboard.
"""
import csv
import json
import subprocess
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
FABRIC = Path.home() / ".claude/skills/especialista-de-dados/scripts/fabric_query.py"
EPOCH = date(2023, 1, 1)


def dia(valor):
    """Data ISO -> dias desde EPOCH (None se vazio)."""
    if not valor:
        return None
    return (date.fromisoformat(valor[:10]) - EPOCH).days


def main():
    with tempfile.TemporaryDirectory() as tmp:
        saida = Path(tmp) / "base.csv"
        subprocess.run(
            [sys.executable, str(FABRIC), "--file", str(RAIZ / "back/sql/base_trocas.sql"), "--out", str(saida), "--max", "0"],
            check=True,
        )
        with open(saida, encoding="utf-8-sig", newline="") as f:
            linhas = list(csv.DictReader(f, delimiter=";"))

    atend, sroms = [], []
    rows = []
    for r in linhas:
        a = r["concessionaria"] or "(sem atendimento)"
        if a not in atend:
            atend.append(a)
        s = r["status_romaneio"]
        if s not in sroms:
            sroms.append(s)
        rows.append([
            atend.index(a),
            dia(r["data_solic"]),
            dia(r["prazo"]),
            dia(r["data_entrega"]),
            sroms.index(s),
            1 if r["status_linha"] == "Aberta" else 0,
            int(float(r["dur_du"])) if r["dur_du"] else None,
        ])

    payload = {
        "gerado_em": datetime.now().isoformat(timespec="minutes"),
        "epoch": EPOCH.isoformat(),
        "colunas": ["atendimento", "data_solic", "prazo", "data_entrega", "status_romaneio", "aberta", "dur_du"],
        "atendimentos": atend,
        "status_romaneio": sroms,
        "rows": rows,
    }
    destino = RAIZ / "front/data/trocas.json"
    destino.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    abertas = sum(r[5] for r in rows)
    print(f"{len(rows):,} linhas ({abertas:,} em aberto) -> {destino}".replace(",", "."))


if __name__ == "__main__":
    main()
