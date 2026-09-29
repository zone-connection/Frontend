import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  PresencaComparativoUsuario,
  PresencaMes,
  PresencaUsuario,
} from "./presenca-api.ts";
import {
  applyPresencaFiltros,
  labelPresencaFiltros,
  rankPorNatureza,
  rankPresenca,
} from "./presenca-filter.ts";

function user(
  id: string,
  nome: string,
  dias: PresencaUsuario["dias"],
): PresencaUsuario {
  return { userId: id, nome, role: "corretor", equipe: "Alpha", dias };
}

function mes(usuarios: PresencaUsuario[]): PresencaMes {
  return {
    ano: 2026,
    mes: 9,
    dias: ["2026-09-01", "2026-09-02"],
    tipos: [],
    podeEditar: true,
    podeTipos: true,
    usuarios,
    comparativoUsuarios: usuarios.map((u) => ({
      userId: u.userId,
      nome: u.nome,
      role: u.role,
      equipe: u.equipe,
      atual: {
        presentes: Object.values(u.dias).filter(
          (c) => c?.natureza === "presente" || c?.natureza === "meio_periodo",
        ).length,
        equivalente: 1,
        faltas: Object.values(u.dias).filter((c) => c?.natureza === "falta")
          .length,
        justificadas: 0,
        lancamentos: 1,
      },
      anterior: {
        presentes: 1,
        equivalente: 1,
        faltas: 0,
        justificadas: 0,
        lancamentos: 1,
      },
    })),
    resumo: {
      porDia: [],
      mediaVieram: 0,
      mediaEquivalente: 0,
      totalVieramDia: 0,
    },
    resumoAnterior: {
      ano: 2026,
      mes: 8,
      porDia: [{ data: "2026-08-01", vieram: 1, equivalente: 1, faltas: 0, justificadas: 0 }],
      mediaVieram: 2,
      mediaEquivalente: 2,
      totalVieramDia: 2,
    },
  };
}

describe("applyPresencaFiltros", () => {
  const ana = user("a", "Ana", {
    "2026-09-01": {
      id: "1",
      tipoId: "p",
      sigla: "P",
      nome: "Presença",
      cor: "#059669",
      natureza: "presente",
      observacao: "",
    },
    "2026-09-02": null,
  });
  const bruno = user("b", "Bruno", {
    "2026-09-01": {
      id: "2",
      tipoId: "f",
      sigla: "F",
      nome: "Falta",
      cor: "#e11d48",
      natureza: "falta",
      observacao: "",
    },
    "2026-09-02": null,
  });

  it("filtra por pessoa e recalcula a média do recorte", () => {
    const view = applyPresencaFiltros(mes([ana, bruno]), ["a"], "todos");
    assert.equal(view.usuarios.length, 1);
    assert.equal(view.usuarios[0]?.nome, "Ana");
    assert.equal(view.resumo.mediaVieram, 0.5);
    assert.equal(view.comparativoUsuarios.length, 1);
  });

  it("filtra quem faltou no mês", () => {
    const view = applyPresencaFiltros(mes([ana, bruno]), [], "falta");
    assert.deepEqual(
      view.usuarios.map((u) => u.userId),
      ["b"],
    );
  });

  it("descreve o recorte do relatório", () => {
    const data = mes([ana, bruno]);
    assert.equal(labelPresencaFiltros(data, [], "todos"), "Equipe completa");
    assert.equal(labelPresencaFiltros(data, ["a"], "falta"), "Pessoa: Ana · Com falta");
  });
});

function pessoa(
  nome: string,
  presentes: number,
  faltas: number,
): PresencaComparativoUsuario {
  const zero = {
    presentes: 0,
    equivalente: 0,
    faltas: 0,
    justificadas: 0,
    lancamentos: 0,
  };
  return {
    userId: nome,
    nome,
    role: "corretor",
    equipe: null,
    atual: { ...zero, presentes, faltas, lancamentos: presentes + faltas },
    anterior: zero,
  };
}

describe("rankPorNatureza", () => {
  const ana = user("a", "Ana", {
    "2026-09-01": {
      id: "1",
      tipoId: "p",
      sigla: "P",
      nome: "Presença",
      cor: "#059669",
      natureza: "presente",
      observacao: "",
    },
    "2026-09-02": {
      id: "2",
      tipoId: "mp",
      sigla: "MP",
      nome: "Meio período",
      cor: "#d97706",
      natureza: "meio_periodo",
      observacao: "",
    },
  });
  const bruno = user("b", "Bruno", {
    "2026-09-01": {
      id: "3",
      tipoId: "mp",
      sigla: "MP",
      nome: "Meio período",
      cor: "#d97706",
      natureza: "meio_periodo",
      observacao: "",
    },
    "2026-09-02": {
      id: "4",
      tipoId: "mp",
      sigla: "MP",
      nome: "Meio período",
      cor: "#d97706",
      natureza: "meio_periodo",
      observacao: "",
    },
  });

  it("separa presença integral de meio período", () => {
    assert.deepEqual(
      rankPorNatureza([ana, bruno], "presente").map((p) => p.nome),
      ["Ana"],
    );
    assert.deepEqual(
      rankPorNatureza([ana, bruno], "meio_periodo").map((p) => [p.nome, p.valor]),
      [
        ["Bruno", 2],
        ["Ana", 1],
      ],
    );
  });
});

describe("rankPresenca", () => {
  const pessoas = [
    pessoa("Bruno", 2, 4),
    pessoa("Ana", 5, 0),
    pessoa("Caio", 5, 1),
    pessoa("Duda", 0, 0),
  ];

  it("ordena quem mais veio e deixa de fora quem não tem marca", () => {
    assert.deepEqual(
      rankPresenca(pessoas, "presentes").map((p) => p.nome),
      ["Ana", "Caio", "Bruno"],
    );
  });

  it("ordena quem mais faltou", () => {
    assert.deepEqual(
      rankPresenca(pessoas, "faltas").map((p) => [p.nome, p.valor]),
      [
        ["Bruno", 4],
        ["Caio", 1],
      ],
    );
  });
});
