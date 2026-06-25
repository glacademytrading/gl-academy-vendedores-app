import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const WORD_REPLACEMENTS = [
  ["instalacao", "instala\u00e7\u00e3o"],
  ["configuracao", "configura\u00e7\u00e3o"],
  ["configuracoes", "configura\u00e7\u00f5es"],
  ["evolucao", "evolu\u00e7\u00e3o"],
  ["visao", "vis\u00e3o"],
  ["conteudos", "conte\u00fados"],
  ["nao", "n\u00e3o"],
  ["voce", "voc\u00ea"],
  ["decisao", "decis\u00e3o"],
  ["decisoes", "decis\u00f5es"],
  ["diagnostico", "diagn\u00f3stico"],
  ["relatorio", "relat\u00f3rio"],
  ["modulo", "m\u00f3dulo"],
  ["modulos", "m\u00f3dulos"],
  ["tecnico", "t\u00e9cnico"],
  ["tecnica", "t\u00e9cnica"],
  ["tecnicos", "t\u00e9cnicos"],
  ["tecnicas", "t\u00e9cnicas"],
  ["operacao", "opera\u00e7\u00e3o"],
  ["operacoes", "opera\u00e7\u00f5es"],
  ["possivel", "poss\u00edvel"],
  ["automatico", "autom\u00e1tico"],
  ["automatica", "autom\u00e1tica"],
  ["diario", "di\u00e1rio"],
  ["revisao", "revis\u00e3o"],
  ["avaliacao", "avalia\u00e7\u00e3o"],
  ["aprovacao", "aprova\u00e7\u00e3o"],
  ["recomendacao", "recomenda\u00e7\u00e3o"],
  ["conteudo", "conte\u00fado"],
  ["botao", "bot\u00e3o"],
  ["comeca", "come\u00e7a"],
  ["execucao", "execu\u00e7\u00e3o"],
  ["forca", "for\u00e7a"],
  ["regiao", "regi\u00e3o"],
  ["favoravel", "favor\u00e1vel"],
  ["conclusoes", "conclus\u00f5es"],
  ["metodo", "m\u00e9todo"],
  ["proximo", "pr\u00f3ximo"],
  ["necessario", "necess\u00e1rio"],
  ["logico", "l\u00f3gico"],
  ["logica", "l\u00f3gica"],
  ["saida", "sa\u00edda"],
  ["saidas", "sa\u00eddas"],
  ["tambem", "tamb\u00e9m"],
  ["ate", "at\u00e9"],
  ["so", "s\u00f3"],
];

const PHRASE_REPLACEMENTS = [
  ["nao e", "n\u00e3o \u00e9"],
  ["nao esta", "n\u00e3o est\u00e1"],
  ["onde esta", "onde est\u00e1"],
  ["preco esta", "pre\u00e7o est\u00e1"],
];

function matchCase(original, replacement) {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function smartPt(value) {
  if (typeof value !== "string") return value ?? "";
  let text = value;

  for (const [from, to] of PHRASE_REPLACEMENTS) {
    text = text.replace(new RegExp(`\\b${from}\\b`, "gi"), (match) => matchCase(match, to));
  }
  text = text.replace(/\bpreco\b/gi, (match) => matchCase(match, "pre\u00e7o"));

  for (const [from, to] of WORD_REPLACEMENTS) {
    text = text.replace(new RegExp(`\\b${from}\\b`, "gi"), (match) => matchCase(match, to));
  }

  return text;
}
