export const businessConfig = {
  name: "Business Control",
  eyebrow: "SISTEMAS SOB MEDIDA PARA EMPRESAS BRASILEIRAS",
  segment: "MEI, pequenas e médias empresas",
  region: "Brasil",
  whatsappNumber: import.meta.env["VITE_WHATSAPP_NUMBER"] ?? "62991478891",
  headline: "Sua empresa cresceu. Seu controle também precisa evoluir.",
  subheadline:
    "Mapeamos sua operação e desenvolvemos um sistema exclusivo para substituir planilhas, reduzir retrabalho e dar clareza para as decisões do dia a dia.",
  description:
    "A Business Control cria sistemas de gestão modelados para a realidade de cada empresa — independentemente do ramo de atuação.",
  primaryColor: "#1d6b5b",
  secondaryColor: "#d9a441",
  privacyUrl: "/privacidade",
  termsUrl: "/termos",
} as const;

export function buildWhatsAppUrl(message: string) {
  const number = businessConfig.whatsappNumber.replace(/\D/g, "");
  if (!number) return "#diagnostico";
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}
