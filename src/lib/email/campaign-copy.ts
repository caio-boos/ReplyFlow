import type { CampaignPresetId } from "@/lib/types";

/** Idiomas suportados no conteúdo do e-mail (iguais aos da loja). */
export type CampaignCopyLanguage =
  | "pt"
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "nl"
  | "ja"
  | "zh";

export const CAMPAIGN_COPY_LANGUAGES: Array<{
  value: CampaignCopyLanguage;
  label: string;
}> = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "nl", label: "Nederlands" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文（简体）" },
];

export type CampaignCopyId = Exclude<CampaignPresetId, "none">;

/** Textos do e-mail aplicados ao escolher uma campanha. */
export interface CampaignCopy {
  banner: string;
  greeting: string;
  body: string;
  button: string;
  subject: string;
  countdown: string;
}

type CampaignCopyMap = Record<CampaignCopyId, CampaignCopy>;

/** Normaliza o idioma da loja (ex.: "pt-BR") para uma chave suportada. */
export function resolveCampaignLanguage(
  language: string | undefined,
): CampaignCopyLanguage {
  const value = (language ?? "en").toLowerCase();
  const match = CAMPAIGN_COPY_LANGUAGES.find((option) =>
    value.startsWith(option.value),
  );
  return match?.value ?? "en";
}

const PT: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — OFERTA RELÂMPAGO",
    greeting: "{{name}}, sua Black Friday está acabando!",
    body: "Os itens do seu carrinho na <strong>{{store}}</strong> ainda estão reservados, mas o preço de Black Friday vale só até o fim do dia.",
    button: "Garantir {{discount}}% OFF agora →",
    subject: "🖤 BLACK FRIDAY: {{discount}}% OFF no seu carrinho — só hoje",
    countdown: "A Black Friday termina em",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24H DE OFERTAS",
    greeting: "{{name}}, a Cyber Monday começou!",
    body: "Separamos o seu carrinho na <strong>{{store}}</strong> com preço de Cyber Monday. São apenas 24 horas de oferta.",
    button: "Aproveitar {{discount}}% OFF →",
    subject: "💻 Cyber Monday: {{discount}}% OFF por 24 horas",
    countdown: "A Cyber Monday termina em",
  },
  christmas: {
    banner: "🎄 NATAL — AINDA DÁ TEMPO",
    greeting: "Olá, {{name}}! Boas festas 🎄",
    body: "Ainda dá tempo de garantir os presentes do seu carrinho na <strong>{{store}}</strong>. Preparamos um desconto especial de Natal para você.",
    button: "Garantir meu presente com {{discount}}% OFF →",
    subject: "🎄 Seu presente ainda está no carrinho — {{discount}}% OFF",
    countdown: "A oferta de Natal termina em",
  },
  newYear: {
    banner: "✨ VIRADA DE ANO — ÚLTIMAS OFERTAS",
    greeting: "{{name}}, comece o ano com o pé direito!",
    body: "Seu carrinho na <strong>{{store}}</strong> está esperando. Aproveite o desconto de virada de ano antes que ele acabe.",
    button: "Começar o ano com {{discount}}% OFF →",
    subject: "✨ Ano Novo: {{discount}}% OFF no seu carrinho",
    countdown: "A oferta de Ano Novo termina em",
  },
  womensDay: {
    banner: "💜 DIA DA MULHER — OFERTA ESPECIAL",
    greeting: "{{name}}, esse presente é para você 💜",
    body: "No Dia da Mulher, os itens do seu carrinho na <strong>{{store}}</strong> estão com um desconto especial.",
    button: "Aproveitar {{discount}}% OFF →",
    subject: "💜 Dia da Mulher: {{discount}}% OFF no seu carrinho",
    countdown: "A oferta do Dia da Mulher termina em",
  },
  mothersDay: {
    banner: "💐 DIA DAS MÃES — PRESENTE GARANTIDO",
    greeting: "{{name}}, o presente da sua mãe está quase indo embora!",
    body: "Os itens do seu carrinho na <strong>{{store}}</strong> continuam reservados. Garanta o presente do Dia das Mães com desconto.",
    button: "Garantir o presente com {{discount}}% OFF →",
    subject: "💐 Dia das Mães: {{discount}}% OFF no presente que você escolheu",
    countdown: "A oferta do Dia das Mães termina em",
  },
  fathersDay: {
    banner: "👔 DIA DOS PAIS — OFERTA ESPECIAL",
    greeting: "{{name}}, o presente do seu pai está no carrinho!",
    body: "Separamos os itens do seu carrinho na <strong>{{store}}</strong> com um desconto de Dia dos Pais.",
    button: "Garantir o presente com {{discount}}% OFF →",
    subject: "👔 Dia dos Pais: {{discount}}% OFF no seu carrinho",
    countdown: "A oferta do Dia dos Pais termina em",
  },
  valentines: {
    banner: "❤️ DIA DOS NAMORADOS — OFERTA A DOIS",
    greeting: "{{name}}, surpreenda quem você ama ❤️",
    body: "Os itens do seu carrinho na <strong>{{store}}</strong> estão reservados com desconto de Dia dos Namorados.",
    button: "Garantir com {{discount}}% OFF →",
    subject: "❤️ Dia dos Namorados: {{discount}}% OFF no seu carrinho",
    countdown: "A oferta do Dia dos Namorados termina em",
  },
  childrensDay: {
    banner: "🎈 DIA DAS CRIANÇAS — DESCONTO ESPECIAL",
    greeting: "{{name}}, a alegria da criançada está esperando!",
    body: "Os itens do seu carrinho na <strong>{{store}}</strong> estão com desconto de Dia das Crianças.",
    button: "Garantir com {{discount}}% OFF →",
    subject: "🎈 Dia das Crianças: {{discount}}% OFF no seu carrinho",
    countdown: "A oferta do Dia das Crianças termina em",
  },
  lastChance: {
    banner: "⚠️ ÚLTIMA CHANCE — SEU CARRINHO EXPIRA HOJE",
    greeting: "{{name}}, seu carrinho expira hoje!",
    body: "Guardamos os itens do seu carrinho na <strong>{{store}}</strong>, mas só conseguimos segurar o desconto até o fim do dia.",
    button: "Finalizar com {{discount}}% OFF →",
    subject: "⚠️ Última chance: {{discount}}% OFF expira hoje",
    countdown: "Seu desconto expira em",
  },
};

const EN: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — FLASH DEAL",
    greeting: "{{name}}, your Black Friday is running out!",
    body: "The items in your cart at <strong>{{store}}</strong> are still reserved, but the Black Friday price only lasts until the end of the day.",
    button: "Grab {{discount}}% OFF now →",
    subject: "🖤 BLACK FRIDAY: {{discount}}% OFF your cart — today only",
    countdown: "Black Friday ends in",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24H OF DEALS",
    greeting: "{{name}}, Cyber Monday is live!",
    body: "We kept your cart at <strong>{{store}}</strong> at Cyber Monday pricing. The deal lasts only 24 hours.",
    button: "Claim {{discount}}% OFF →",
    subject: "💻 Cyber Monday: {{discount}}% OFF for 24 hours",
    countdown: "Cyber Monday ends in",
  },
  christmas: {
    banner: "🎄 CHRISTMAS — STILL IN TIME",
    greeting: "Hi, {{name}}! Happy holidays 🎄",
    body: "There's still time to secure the gifts in your cart at <strong>{{store}}</strong>. We've prepared a special Christmas discount for you.",
    button: "Secure my gift with {{discount}}% OFF →",
    subject: "🎄 Your gift is still in the cart — {{discount}}% OFF",
    countdown: "The Christmas offer ends in",
  },
  newYear: {
    banner: "✨ NEW YEAR — FINAL DEALS",
    greeting: "{{name}}, start the year on the right foot!",
    body: "Your cart at <strong>{{store}}</strong> is waiting. Take the New Year discount before it's gone.",
    button: "Start the year with {{discount}}% OFF →",
    subject: "✨ New Year: {{discount}}% OFF your cart",
    countdown: "The New Year offer ends in",
  },
  womensDay: {
    banner: "💜 WOMEN'S DAY — SPECIAL OFFER",
    greeting: "{{name}}, this one is for you 💜",
    body: "For Women's Day, the items in your cart at <strong>{{store}}</strong> come with a special discount.",
    button: "Claim {{discount}}% OFF →",
    subject: "💜 Women's Day: {{discount}}% OFF your cart",
    countdown: "The Women's Day offer ends in",
  },
  mothersDay: {
    banner: "💐 MOTHER'S DAY — GIFT SECURED",
    greeting: "{{name}}, your mom's gift is about to slip away!",
    body: "The items in your cart at <strong>{{store}}</strong> are still reserved. Secure the Mother's Day gift at a discount.",
    button: "Secure the gift with {{discount}}% OFF →",
    subject: "💐 Mother's Day: {{discount}}% OFF the gift you picked",
    countdown: "The Mother's Day offer ends in",
  },
  fathersDay: {
    banner: "👔 FATHER'S DAY — SPECIAL OFFER",
    greeting: "{{name}}, your dad's gift is in the cart!",
    body: "We kept the items in your cart at <strong>{{store}}</strong> with a Father's Day discount.",
    button: "Secure the gift with {{discount}}% OFF →",
    subject: "👔 Father's Day: {{discount}}% OFF your cart",
    countdown: "The Father's Day offer ends in",
  },
  valentines: {
    banner: "❤️ VALENTINE'S DAY — OFFER FOR TWO",
    greeting: "{{name}}, surprise the one you love ❤️",
    body: "The items in your cart at <strong>{{store}}</strong> are reserved with a Valentine's Day discount.",
    button: "Secure it with {{discount}}% OFF →",
    subject: "❤️ Valentine's Day: {{discount}}% OFF your cart",
    countdown: "The Valentine's Day offer ends in",
  },
  childrensDay: {
    banner: "🎈 CHILDREN'S DAY — SPECIAL DISCOUNT",
    greeting: "{{name}}, the fun is waiting!",
    body: "The items in your cart at <strong>{{store}}</strong> come with a Children's Day discount.",
    button: "Secure it with {{discount}}% OFF →",
    subject: "🎈 Children's Day: {{discount}}% OFF your cart",
    countdown: "The Children's Day offer ends in",
  },
  lastChance: {
    banner: "⚠️ LAST CHANCE — YOUR CART EXPIRES TODAY",
    greeting: "{{name}}, your cart expires today!",
    body: "We saved the items in your cart at <strong>{{store}}</strong>, but we can only hold the discount until the end of the day.",
    button: "Check out with {{discount}}% OFF →",
    subject: "⚠️ Last chance: {{discount}}% OFF expires today",
    countdown: "Your discount expires in",
  },
};

const ES: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — OFERTA RELÁMPAGO",
    greeting: "¡{{name}}, tu Black Friday se acaba!",
    body: "Los artículos de tu carrito en <strong>{{store}}</strong> siguen reservados, pero el precio de Black Friday solo vale hasta el final del día.",
    button: "Conseguir {{discount}}% OFF ahora →",
    subject: "🖤 BLACK FRIDAY: {{discount}}% OFF en tu carrito — solo hoy",
    countdown: "El Black Friday termina en",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24H DE OFERTAS",
    greeting: "¡{{name}}, el Cyber Monday ya empezó!",
    body: "Guardamos tu carrito en <strong>{{store}}</strong> con precio de Cyber Monday. La oferta dura solo 24 horas.",
    button: "Aprovechar {{discount}}% OFF →",
    subject: "💻 Cyber Monday: {{discount}}% OFF por 24 horas",
    countdown: "El Cyber Monday termina en",
  },
  christmas: {
    banner: "🎄 NAVIDAD — AÚN ESTÁS A TIEMPO",
    greeting: "¡Hola, {{name}}! Felices fiestas 🎄",
    body: "Todavía estás a tiempo de asegurar los regalos de tu carrito en <strong>{{store}}</strong>. Preparamos un descuento especial de Navidad para ti.",
    button: "Asegurar mi regalo con {{discount}}% OFF →",
    subject: "🎄 Tu regalo sigue en el carrito — {{discount}}% OFF",
    countdown: "La oferta de Navidad termina en",
  },
  newYear: {
    banner: "✨ AÑO NUEVO — ÚLTIMAS OFERTAS",
    greeting: "¡{{name}}, empieza el año con el pie derecho!",
    body: "Tu carrito en <strong>{{store}}</strong> te está esperando. Aprovecha el descuento de fin de año antes de que termine.",
    button: "Empezar el año con {{discount}}% OFF →",
    subject: "✨ Año Nuevo: {{discount}}% OFF en tu carrito",
    countdown: "La oferta de Año Nuevo termina en",
  },
  womensDay: {
    banner: "💜 DÍA DE LA MUJER — OFERTA ESPECIAL",
    greeting: "{{name}}, este regalo es para ti 💜",
    body: "Por el Día de la Mujer, los artículos de tu carrito en <strong>{{store}}</strong> tienen un descuento especial.",
    button: "Aprovechar {{discount}}% OFF →",
    subject: "💜 Día de la Mujer: {{discount}}% OFF en tu carrito",
    countdown: "La oferta del Día de la Mujer termina en",
  },
  mothersDay: {
    banner: "💐 DÍA DE LA MADRE — REGALO ASEGURADO",
    greeting: "¡{{name}}, el regalo de tu mamá está por escaparse!",
    body: "Los artículos de tu carrito en <strong>{{store}}</strong> siguen reservados. Asegura el regalo del Día de la Madre con descuento.",
    button: "Asegurar el regalo con {{discount}}% OFF →",
    subject: "💐 Día de la Madre: {{discount}}% OFF en el regalo que elegiste",
    countdown: "La oferta del Día de la Madre termina en",
  },
  fathersDay: {
    banner: "👔 DÍA DEL PADRE — OFERTA ESPECIAL",
    greeting: "¡{{name}}, el regalo de tu papá está en el carrito!",
    body: "Guardamos los artículos de tu carrito en <strong>{{store}}</strong> con un descuento del Día del Padre.",
    button: "Asegurar el regalo con {{discount}}% OFF →",
    subject: "👔 Día del Padre: {{discount}}% OFF en tu carrito",
    countdown: "La oferta del Día del Padre termina en",
  },
  valentines: {
    banner: "❤️ SAN VALENTÍN — OFERTA PARA DOS",
    greeting: "{{name}}, sorprende a quien amas ❤️",
    body: "Los artículos de tu carrito en <strong>{{store}}</strong> están reservados con descuento de San Valentín.",
    button: "Asegurar con {{discount}}% OFF →",
    subject: "❤️ San Valentín: {{discount}}% OFF en tu carrito",
    countdown: "La oferta de San Valentín termina en",
  },
  childrensDay: {
    banner: "🎈 DÍA DEL NIÑO — DESCUENTO ESPECIAL",
    greeting: "¡{{name}}, la diversión te está esperando!",
    body: "Los artículos de tu carrito en <strong>{{store}}</strong> tienen descuento del Día del Niño.",
    button: "Asegurar con {{discount}}% OFF →",
    subject: "🎈 Día del Niño: {{discount}}% OFF en tu carrito",
    countdown: "La oferta del Día del Niño termina en",
  },
  lastChance: {
    banner: "⚠️ ÚLTIMA OPORTUNIDAD — TU CARRITO EXPIRA HOY",
    greeting: "¡{{name}}, tu carrito expira hoy!",
    body: "Guardamos los artículos de tu carrito en <strong>{{store}}</strong>, pero solo podemos mantener el descuento hasta el final del día.",
    button: "Finalizar con {{discount}}% OFF →",
    subject: "⚠️ Última oportunidad: {{discount}}% OFF expira hoy",
    countdown: "Tu descuento expira en",
  },
};

const FR: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — OFFRE ÉCLAIR",
    greeting: "{{name}}, votre Black Friday se termine !",
    body: "Les articles de votre panier chez <strong>{{store}}</strong> sont toujours réservés, mais le prix Black Friday n'est valable que jusqu'à la fin de la journée.",
    button: "Profiter de {{discount}}% de réduction →",
    subject: "🖤 BLACK FRIDAY : {{discount}}% sur votre panier — aujourd'hui seulement",
    countdown: "Le Black Friday se termine dans",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24H D'OFFRES",
    greeting: "{{name}}, le Cyber Monday a commencé !",
    body: "Nous avons gardé votre panier chez <strong>{{store}}</strong> au prix Cyber Monday. L'offre ne dure que 24 heures.",
    button: "Profiter de {{discount}}% de réduction →",
    subject: "💻 Cyber Monday : {{discount}}% pendant 24 heures",
    countdown: "Le Cyber Monday se termine dans",
  },
  christmas: {
    banner: "🎄 NOËL — IL EST ENCORE TEMPS",
    greeting: "Bonjour {{name}} ! Joyeuses fêtes 🎄",
    body: "Il est encore temps de sécuriser les cadeaux de votre panier chez <strong>{{store}}</strong>. Nous avons préparé une réduction spéciale de Noël pour vous.",
    button: "Sécuriser mon cadeau avec {{discount}}% →",
    subject: "🎄 Votre cadeau est encore dans le panier — {{discount}}% de réduction",
    countdown: "L'offre de Noël se termine dans",
  },
  newYear: {
    banner: "✨ NOUVEL AN — DERNIÈRES OFFRES",
    greeting: "{{name}}, commencez l'année du bon pied !",
    body: "Votre panier chez <strong>{{store}}</strong> vous attend. Profitez de la réduction du Nouvel An avant qu'elle ne disparaisse.",
    button: "Commencer l'année avec {{discount}}% →",
    subject: "✨ Nouvel An : {{discount}}% sur votre panier",
    countdown: "L'offre du Nouvel An se termine dans",
  },
  womensDay: {
    banner: "💜 JOURNÉE DE LA FEMME — OFFRE SPÉCIALE",
    greeting: "{{name}}, ce cadeau est pour vous 💜",
    body: "Pour la Journée de la femme, les articles de votre panier chez <strong>{{store}}</strong> bénéficient d'une réduction spéciale.",
    button: "Profiter de {{discount}}% →",
    subject: "💜 Journée de la femme : {{discount}}% sur votre panier",
    countdown: "L'offre de la Journée de la femme se termine dans",
  },
  mothersDay: {
    banner: "💐 FÊTE DES MÈRES — CADEAU ASSURÉ",
    greeting: "{{name}}, le cadeau de votre maman risque de vous échapper !",
    body: "Les articles de votre panier chez <strong>{{store}}</strong> sont toujours réservés. Sécurisez le cadeau de la fête des mères avec une réduction.",
    button: "Sécuriser le cadeau avec {{discount}}% →",
    subject: "💐 Fête des mères : {{discount}}% sur le cadeau choisi",
    countdown: "L'offre de la fête des mères se termine dans",
  },
  fathersDay: {
    banner: "👔 FÊTE DES PÈRES — OFFRE SPÉCIALE",
    greeting: "{{name}}, le cadeau de votre papa est dans le panier !",
    body: "Nous avons gardé les articles de votre panier chez <strong>{{store}}</strong> avec une réduction fête des pères.",
    button: "Sécuriser le cadeau avec {{discount}}% →",
    subject: "👔 Fête des pères : {{discount}}% sur votre panier",
    countdown: "L'offre de la fête des pères se termine dans",
  },
  valentines: {
    banner: "❤️ SAINT-VALENTIN — OFFRE À DEUX",
    greeting: "{{name}}, surprenez celui ou celle que vous aimez ❤️",
    body: "Les articles de votre panier chez <strong>{{store}}</strong> sont réservés avec une réduction Saint-Valentin.",
    button: "Sécuriser avec {{discount}}% →",
    subject: "❤️ Saint-Valentin : {{discount}}% sur votre panier",
    countdown: "L'offre de la Saint-Valentin se termine dans",
  },
  childrensDay: {
    banner: "🎈 FÊTE DES ENFANTS — REMISE SPÉCIALE",
    greeting: "{{name}}, la fête n'attend que vous !",
    body: "Les articles de votre panier chez <strong>{{store}}</strong> bénéficient d'une réduction fête des enfants.",
    button: "Sécuriser avec {{discount}}% →",
    subject: "🎈 Fête des enfants : {{discount}}% sur votre panier",
    countdown: "L'offre de la fête des enfants se termine dans",
  },
  lastChance: {
    banner: "⚠️ DERNIÈRE CHANCE — VOTRE PANIER EXPIRE AUJOURD'HUI",
    greeting: "{{name}}, votre panier expire aujourd'hui !",
    body: "Nous avons gardé les articles de votre panier chez <strong>{{store}}</strong>, mais la réduction ne tient que jusqu'à la fin de la journée.",
    button: "Finaliser avec {{discount}}% →",
    subject: "⚠️ Dernière chance : {{discount}}% expire aujourd'hui",
    countdown: "Votre réduction expire dans",
  },
};

const DE: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — BLITZANGEBOT",
    greeting: "{{name}}, dein Black Friday läuft ab!",
    body: "Die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> sind noch reserviert, aber der Black-Friday-Preis gilt nur bis zum Ende des Tages.",
    button: "Jetzt {{discount}}% Rabatt sichern →",
    subject: "🖤 BLACK FRIDAY: {{discount}}% Rabatt auf deinen Warenkorb — nur heute",
    countdown: "Black Friday endet in",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24H ANGEBOTE",
    greeting: "{{name}}, der Cyber Monday läuft!",
    body: "Wir haben deinen Warenkorb bei <strong>{{store}}</strong> zum Cyber-Monday-Preis reserviert. Das Angebot gilt nur 24 Stunden.",
    button: "{{discount}}% Rabatt sichern →",
    subject: "💻 Cyber Monday: {{discount}}% Rabatt für 24 Stunden",
    countdown: "Cyber Monday endet in",
  },
  christmas: {
    banner: "🎄 WEIHNACHTEN — NOCH RECHTZEITIG",
    greeting: "Hallo {{name}}! Frohe Festtage 🎄",
    body: "Du kannst die Geschenke in deinem Warenkorb bei <strong>{{store}}</strong> noch sichern. Wir haben einen besonderen Weihnachtsrabatt für dich vorbereitet.",
    button: "Geschenk mit {{discount}}% Rabatt sichern →",
    subject: "🎄 Dein Geschenk liegt noch im Warenkorb — {{discount}}% Rabatt",
    countdown: "Das Weihnachtsangebot endet in",
  },
  newYear: {
    banner: "✨ NEUJAHR — LETZTE ANGEBOTE",
    greeting: "{{name}}, starte gut ins neue Jahr!",
    body: "Dein Warenkorb bei <strong>{{store}}</strong> wartet auf dich. Nutze den Neujahrsrabatt, bevor er weg ist.",
    button: "Mit {{discount}}% Rabatt ins neue Jahr →",
    subject: "✨ Neujahr: {{discount}}% Rabatt auf deinen Warenkorb",
    countdown: "Das Neujahrsangebot endet in",
  },
  womensDay: {
    banner: "💜 WELTFRAUENTAG — SONDERANGEBOT",
    greeting: "{{name}}, das hier ist für dich 💜",
    body: "Zum Weltfrauentag gibt es auf die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> einen besonderen Rabatt.",
    button: "{{discount}}% Rabatt sichern →",
    subject: "💜 Weltfrauentag: {{discount}}% Rabatt auf deinen Warenkorb",
    countdown: "Das Angebot zum Weltfrauentag endet in",
  },
  mothersDay: {
    banner: "💐 MUTTERTAG — GESCHENK GESICHERT",
    greeting: "{{name}}, das Geschenk für deine Mama entwischt dir gleich!",
    body: "Die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> sind noch reserviert. Sichere dir das Muttertagsgeschenk mit Rabatt.",
    button: "Geschenk mit {{discount}}% Rabatt sichern →",
    subject: "💐 Muttertag: {{discount}}% Rabatt auf dein ausgewähltes Geschenk",
    countdown: "Das Muttertagsangebot endet in",
  },
  fathersDay: {
    banner: "👔 VATERTAG — SONDERANGEBOT",
    greeting: "{{name}}, das Geschenk für deinen Papa liegt im Warenkorb!",
    body: "Wir haben die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> mit einem Vatertagsrabatt reserviert.",
    button: "Geschenk mit {{discount}}% Rabatt sichern →",
    subject: "👔 Vatertag: {{discount}}% Rabatt auf deinen Warenkorb",
    countdown: "Das Vatertagsangebot endet in",
  },
  valentines: {
    banner: "❤️ VALENTINSTAG — ANGEBOT ZU ZWEIT",
    greeting: "{{name}}, überrasche den Menschen, den du liebst ❤️",
    body: "Die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> sind mit einem Valentinsrabatt reserviert.",
    button: "Mit {{discount}}% Rabatt sichern →",
    subject: "❤️ Valentinstag: {{discount}}% Rabatt auf deinen Warenkorb",
    countdown: "Das Valentinsangebot endet in",
  },
  childrensDay: {
    banner: "🎈 KINDERTAG — SONDERRABATT",
    greeting: "{{name}}, der Spaß wartet schon!",
    body: "Auf die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> gibt es einen Kindertagsrabatt.",
    button: "Mit {{discount}}% Rabatt sichern →",
    subject: "🎈 Kindertag: {{discount}}% Rabatt auf deinen Warenkorb",
    countdown: "Das Kindertagsangebot endet in",
  },
  lastChance: {
    banner: "⚠️ LETZTE CHANCE — DEIN WARENKORB LÄUFT HEUTE AB",
    greeting: "{{name}}, dein Warenkorb läuft heute ab!",
    body: "Wir haben die Artikel in deinem Warenkorb bei <strong>{{store}}</strong> aufbewahrt, aber den Rabatt können wir nur bis zum Ende des Tages halten.",
    button: "Mit {{discount}}% Rabatt bestellen →",
    subject: "⚠️ Letzte Chance: {{discount}}% Rabatt läuft heute ab",
    countdown: "Dein Rabatt läuft ab in",
  },
};

const IT: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — OFFERTA LAMPO",
    greeting: "{{name}}, il tuo Black Friday sta finendo!",
    body: "Gli articoli nel tuo carrello su <strong>{{store}}</strong> sono ancora riservati, ma il prezzo Black Friday vale solo fino a fine giornata.",
    button: "Prendi subito il {{discount}}% di sconto →",
    subject: "🖤 BLACK FRIDAY: {{discount}}% di sconto sul tuo carrello — solo oggi",
    countdown: "Il Black Friday finisce tra",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24H DI OFFERTE",
    greeting: "{{name}}, il Cyber Monday è iniziato!",
    body: "Abbiamo tenuto il tuo carrello su <strong>{{store}}</strong> al prezzo Cyber Monday. L'offerta dura solo 24 ore.",
    button: "Approfitta del {{discount}}% di sconto →",
    subject: "💻 Cyber Monday: {{discount}}% di sconto per 24 ore",
    countdown: "Il Cyber Monday finisce tra",
  },
  christmas: {
    banner: "🎄 NATALE — SEI ANCORA IN TEMPO",
    greeting: "Ciao {{name}}! Buone feste 🎄",
    body: "Sei ancora in tempo per assicurarti i regali nel tuo carrello su <strong>{{store}}</strong>. Abbiamo preparato uno sconto speciale di Natale per te.",
    button: "Assicurati il regalo con il {{discount}}% di sconto →",
    subject: "🎄 Il tuo regalo è ancora nel carrello — {{discount}}% di sconto",
    countdown: "L'offerta di Natale finisce tra",
  },
  newYear: {
    banner: "✨ CAPODANNO — ULTIME OFFERTE",
    greeting: "{{name}}, inizia l'anno col piede giusto!",
    body: "Il tuo carrello su <strong>{{store}}</strong> ti aspetta. Approfitta dello sconto di Capodanno prima che finisca.",
    button: "Inizia l'anno con il {{discount}}% di sconto →",
    subject: "✨ Capodanno: {{discount}}% di sconto sul tuo carrello",
    countdown: "L'offerta di Capodanno finisce tra",
  },
  womensDay: {
    banner: "💜 FESTA DELLA DONNA — OFFERTA SPECIALE",
    greeting: "{{name}}, questo è per te 💜",
    body: "Per la Festa della Donna, gli articoli nel tuo carrello su <strong>{{store}}</strong> hanno uno sconto speciale.",
    button: "Approfitta del {{discount}}% di sconto →",
    subject: "💜 Festa della Donna: {{discount}}% di sconto sul tuo carrello",
    countdown: "L'offerta della Festa della Donna finisce tra",
  },
  mothersDay: {
    banner: "💐 FESTA DELLA MAMMA — REGALO ASSICURATO",
    greeting: "{{name}}, il regalo per la tua mamma sta per sfuggirti!",
    body: "Gli articoli nel tuo carrello su <strong>{{store}}</strong> sono ancora riservati. Assicurati il regalo per la Festa della Mamma con lo sconto.",
    button: "Assicurati il regalo con il {{discount}}% di sconto →",
    subject: "💐 Festa della Mamma: {{discount}}% di sconto sul regalo che hai scelto",
    countdown: "L'offerta della Festa della Mamma finisce tra",
  },
  fathersDay: {
    banner: "👔 FESTA DEL PAPÀ — OFFERTA SPECIALE",
    greeting: "{{name}}, il regalo per il tuo papà è nel carrello!",
    body: "Abbiamo tenuto gli articoli del tuo carrello su <strong>{{store}}</strong> con uno sconto per la Festa del Papà.",
    button: "Assicurati il regalo con il {{discount}}% di sconto →",
    subject: "👔 Festa del Papà: {{discount}}% di sconto sul tuo carrello",
    countdown: "L'offerta della Festa del Papà finisce tra",
  },
  valentines: {
    banner: "❤️ SAN VALENTINO — OFFERTA PER DUE",
    greeting: "{{name}}, sorprendi chi ami ❤️",
    body: "Gli articoli nel tuo carrello su <strong>{{store}}</strong> sono riservati con uno sconto di San Valentino.",
    button: "Assicurati con il {{discount}}% di sconto →",
    subject: "❤️ San Valentino: {{discount}}% di sconto sul tuo carrello",
    countdown: "L'offerta di San Valentino finisce tra",
  },
  childrensDay: {
    banner: "🎈 FESTA DEI BAMBINI — SCONTO SPECIALE",
    greeting: "{{name}}, il divertimento ti aspetta!",
    body: "Gli articoli nel tuo carrello su <strong>{{store}}</strong> hanno uno sconto per la Festa dei Bambini.",
    button: "Assicurati con il {{discount}}% di sconto →",
    subject: "🎈 Festa dei Bambini: {{discount}}% di sconto sul tuo carrello",
    countdown: "L'offerta della Festa dei Bambini finisce tra",
  },
  lastChance: {
    banner: "⚠️ ULTIMA OCCASIONE — IL TUO CARRELLO SCADE OGGI",
    greeting: "{{name}}, il tuo carrello scade oggi!",
    body: "Abbiamo conservato gli articoli del tuo carrello su <strong>{{store}}</strong>, ma possiamo tenere lo sconto solo fino a fine giornata.",
    button: "Completa con il {{discount}}% di sconto →",
    subject: "⚠️ Ultima occasione: il {{discount}}% di sconto scade oggi",
    countdown: "Il tuo sconto scade tra",
  },
};

const NL: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 BLACK FRIDAY — FLASHDEAL",
    greeting: "{{name}}, je Black Friday loopt af!",
    body: "De artikelen in je winkelwagen bij <strong>{{store}}</strong> zijn nog gereserveerd, maar de Black Friday-prijs geldt alleen tot het einde van de dag.",
    button: "Pak nu {{discount}}% korting →",
    subject: "🖤 BLACK FRIDAY: {{discount}}% korting op je winkelwagen — alleen vandaag",
    countdown: "Black Friday eindigt over",
  },
  cyberMonday: {
    banner: "💻 CYBER MONDAY — 24 UUR DEALS",
    greeting: "{{name}}, Cyber Monday is begonnen!",
    body: "We hebben je winkelwagen bij <strong>{{store}}</strong> bewaard tegen Cyber Monday-prijs. De aanbieding duurt maar 24 uur.",
    button: "Profiteer van {{discount}}% korting →",
    subject: "💻 Cyber Monday: {{discount}}% korting gedurende 24 uur",
    countdown: "Cyber Monday eindigt over",
  },
  christmas: {
    banner: "🎄 KERST — JE BENT NOG OP TIJD",
    greeting: "Hallo {{name}}! Fijne feestdagen 🎄",
    body: "Je bent nog op tijd om de cadeaus in je winkelwagen bij <strong>{{store}}</strong> veilig te stellen. We hebben een speciale kerstkorting voor je.",
    button: "Cadeau veiligstellen met {{discount}}% korting →",
    subject: "🎄 Je cadeau ligt nog in de winkelwagen — {{discount}}% korting",
    countdown: "De kerstaanbieding eindigt over",
  },
  newYear: {
    banner: "✨ NIEUWJAAR — LAATSTE AANBIEDINGEN",
    greeting: "{{name}}, begin het jaar goed!",
    body: "Je winkelwagen bij <strong>{{store}}</strong> wacht op je. Profiteer van de nieuwjaarskorting voordat die verdwijnt.",
    button: "Begin het jaar met {{discount}}% korting →",
    subject: "✨ Nieuwjaar: {{discount}}% korting op je winkelwagen",
    countdown: "De nieuwjaarsaanbieding eindigt over",
  },
  womensDay: {
    banner: "💜 INTERNATIONALE VROUWENDAG — SPECIALE AANBIEDING",
    greeting: "{{name}}, dit is voor jou 💜",
    body: "Voor Internationale Vrouwendag krijgen de artikelen in je winkelwagen bij <strong>{{store}}</strong> een speciale korting.",
    button: "Profiteer van {{discount}}% korting →",
    subject: "💜 Vrouwendag: {{discount}}% korting op je winkelwagen",
    countdown: "De aanbieding voor Vrouwendag eindigt over",
  },
  mothersDay: {
    banner: "💐 MOEDERDAG — CADEAU VEILIGGESTELD",
    greeting: "{{name}}, het cadeau voor je moeder glipt bijna weg!",
    body: "De artikelen in je winkelwagen bij <strong>{{store}}</strong> zijn nog gereserveerd. Stel het moederdagcadeau veilig met korting.",
    button: "Cadeau veiligstellen met {{discount}}% korting →",
    subject: "💐 Moederdag: {{discount}}% korting op het cadeau dat je koos",
    countdown: "De moederdagaanbieding eindigt over",
  },
  fathersDay: {
    banner: "👔 VADERDAG — SPECIALE AANBIEDING",
    greeting: "{{name}}, het cadeau voor je vader ligt in je winkelwagen!",
    body: "We hebben de artikelen in je winkelwagen bij <strong>{{store}}</strong> bewaard met vaderdagkorting.",
    button: "Cadeau veiligstellen met {{discount}}% korting →",
    subject: "👔 Vaderdag: {{discount}}% korting op je winkelwagen",
    countdown: "De vaderdagaanbieding eindigt over",
  },
  valentines: {
    banner: "❤️ VALENTIJNSDAG — AANBIEDING VOOR TWEE",
    greeting: "{{name}}, verras degene van wie je houdt ❤️",
    body: "De artikelen in je winkelwagen bij <strong>{{store}}</strong> zijn gereserveerd met valentijnskorting.",
    button: "Veiligstellen met {{discount}}% korting →",
    subject: "❤️ Valentijnsdag: {{discount}}% korting op je winkelwagen",
    countdown: "De valentijnsaanbieding eindigt over",
  },
  childrensDay: {
    banner: "🎈 KINDERDAG — SPECIALE KORTING",
    greeting: "{{name}}, het plezier wacht op je!",
    body: "De artikelen in je winkelwagen bij <strong>{{store}}</strong> hebben kinderdagkorting.",
    button: "Veiligstellen met {{discount}}% korting →",
    subject: "🎈 Kinderdag: {{discount}}% korting op je winkelwagen",
    countdown: "De kinderdagaanbieding eindigt over",
  },
  lastChance: {
    banner: "⚠️ LAATSTE KANS — JE WINKELWAGEN VERLOOPT VANDAAG",
    greeting: "{{name}}, je winkelwagen verloopt vandaag!",
    body: "We hebben de artikelen in je winkelwagen bij <strong>{{store}}</strong> bewaard, maar de korting geldt alleen tot het einde van de dag.",
    button: "Afrekenen met {{discount}}% korting →",
    subject: "⚠️ Laatste kans: {{discount}}% korting verloopt vandaag",
    countdown: "Je korting verloopt over",
  },
};

const JA: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 ブラックフライデー — タイムセール",
    greeting: "{{name}}様、ブラックフライデーがまもなく終了します！",
    body: "<strong>{{store}}</strong>のカートの商品はまだ確保されていますが、ブラックフライデー価格は本日限りです。",
    button: "今すぐ{{discount}}%OFFで購入 →",
    subject: "🖤 ブラックフライデー：カートの商品が{{discount}}%OFF — 本日限り",
    countdown: "ブラックフライデー終了まで",
  },
  cyberMonday: {
    banner: "💻 サイバーマンデー — 24時間限定",
    greeting: "{{name}}様、サイバーマンデー開催中！",
    body: "<strong>{{store}}</strong>のカートをサイバーマンデー価格でお取り置きしました。24時間限定のオファーです。",
    button: "{{discount}}%OFFを利用する →",
    subject: "💻 サイバーマンデー：24時間限定{{discount}}%OFF",
    countdown: "サイバーマンデー終了まで",
  },
  christmas: {
    banner: "🎄 クリスマス — まだ間に合います",
    greeting: "{{name}}様、こんにちは！ メリークリスマス 🎄",
    body: "<strong>{{store}}</strong>のカートに入っているギフトは、まだご購入いただけます。特別なクリスマス割引をご用意しました。",
    button: "{{discount}}%OFFでギフトを確保 →",
    subject: "🎄 ギフトがカートに残っています — {{discount}}%OFF",
    countdown: "クリスマスオファー終了まで",
  },
  newYear: {
    banner: "✨ 新年 — ラストオファー",
    greeting: "{{name}}様、新年を気持ちよくスタート！",
    body: "<strong>{{store}}</strong>のカートがお待ちしています。新年割引が終わる前にご利用ください。",
    button: "{{discount}}%OFFで新年をスタート →",
    subject: "✨ 新年：カートの商品が{{discount}}%OFF",
    countdown: "新年オファー終了まで",
  },
  womensDay: {
    banner: "💜 国際女性デー — 特別オファー",
    greeting: "{{name}}様、あなたへの特別なご提案です 💜",
    body: "国際女性デーを記念して、<strong>{{store}}</strong>のカートの商品を特別価格でご用意しました。",
    button: "{{discount}}%OFFを利用する →",
    subject: "💜 国際女性デー：カートの商品が{{discount}}%OFF",
    countdown: "国際女性デーのオファー終了まで",
  },
  mothersDay: {
    banner: "💐 母の日 — ギフトを確保",
    greeting: "{{name}}様、お母様へのギフトがまもなく手に入らなくなります！",
    body: "<strong>{{store}}</strong>のカートの商品はまだ確保されています。母の日のギフトを割引価格でどうぞ。",
    button: "{{discount}}%OFFでギフトを確保 →",
    subject: "💐 母の日：お選びのギフトが{{discount}}%OFF",
    countdown: "母の日のオファー終了まで",
  },
  fathersDay: {
    banner: "👔 父の日 — 特別オファー",
    greeting: "{{name}}様、お父様へのギフトがカートに入っています！",
    body: "<strong>{{store}}</strong>のカートの商品を、父の日割引でお取り置きしました。",
    button: "{{discount}}%OFFでギフトを確保 →",
    subject: "👔 父の日：カートの商品が{{discount}}%OFF",
    countdown: "父の日のオファー終了まで",
  },
  valentines: {
    banner: "❤️ バレンタインデー — 2人のためのオファー",
    greeting: "{{name}}様、大切な人を驚かせましょう ❤️",
    body: "<strong>{{store}}</strong>のカートの商品を、バレンタイン割引でお取り置きしています。",
    button: "{{discount}}%OFFで確保する →",
    subject: "❤️ バレンタインデー：カートの商品が{{discount}}%OFF",
    countdown: "バレンタインオファー終了まで",
  },
  childrensDay: {
    banner: "🎈 こどもの日 — 特別割引",
    greeting: "{{name}}様、楽しい時間が待っています！",
    body: "<strong>{{store}}</strong>のカートの商品が、こどもの日割引の対象です。",
    button: "{{discount}}%OFFで確保する →",
    subject: "🎈 こどもの日：カートの商品が{{discount}}%OFF",
    countdown: "こどもの日のオファー終了まで",
  },
  lastChance: {
    banner: "⚠️ ラストチャンス — カートは本日中に期限切れ",
    greeting: "{{name}}様、カートの有効期限は本日までです！",
    body: "<strong>{{store}}</strong>のカートの商品をお取り置きしていますが、割引は本日の終わりまでしかお約束できません。",
    button: "{{discount}}%OFFで購入する →",
    subject: "⚠️ ラストチャンス：{{discount}}%OFFは本日まで",
    countdown: "割引終了まで",
  },
};

const ZH: CampaignCopyMap = {
  blackFriday: {
    banner: "🖤 黑色星期五 — 限时闪购",
    greeting: "{{name}}，您的黑五优惠即将结束！",
    body: "您在 <strong>{{store}}</strong> 购物车中的商品仍为您保留，但黑五价格仅限今日。",
    button: "立即享受 {{discount}}% 折扣 →",
    subject: "🖤 黑色星期五：购物车商品 {{discount}}% 折扣 — 仅限今天",
    countdown: "黑色星期五结束倒计时",
  },
  cyberMonday: {
    banner: "💻 网络星期一 — 24小时特惠",
    greeting: "{{name}}，网络星期一开始了！",
    body: "我们为您保留了 <strong>{{store}}</strong> 购物车的网络星期一价格，优惠仅持续 24 小时。",
    button: "领取 {{discount}}% 折扣 →",
    subject: "💻 网络星期一：{{discount}}% 折扣，仅限24小时",
    countdown: "网络星期一结束倒计时",
  },
  christmas: {
    banner: "🎄 圣诞节 — 还来得及",
    greeting: "{{name}}，您好！圣诞快乐 🎄",
    body: "您还来得及拿下 <strong>{{store}}</strong> 购物车里的礼物。我们为您准备了圣诞专属折扣。",
    button: "用 {{discount}}% 折扣拿下礼物 →",
    subject: "🎄 您的礼物还在购物车 — {{discount}}% 折扣",
    countdown: "圣诞优惠结束倒计时",
  },
  newYear: {
    banner: "✨ 新年 — 最后优惠",
    greeting: "{{name}}，新年有个好开始！",
    body: "您的 <strong>{{store}}</strong> 购物车还在等您。请在新年折扣结束前使用。",
    button: "用 {{discount}}% 折扣开启新年 →",
    subject: "✨ 新年：购物车商品 {{discount}}% 折扣",
    countdown: "新年优惠结束倒计时",
  },
  womensDay: {
    banner: "💜 国际妇女节 — 专属优惠",
    greeting: "{{name}}，这份心意送给您 💜",
    body: "为庆祝国际妇女节，您在 <strong>{{store}}</strong> 购物车中的商品享有专属折扣。",
    button: "领取 {{discount}}% 折扣 →",
    subject: "💜 妇女节：购物车商品 {{discount}}% 折扣",
    countdown: "妇女节优惠结束倒计时",
  },
  mothersDay: {
    banner: "💐 母亲节 — 礼物已为您保留",
    greeting: "{{name}}，送给妈妈的礼物快要错过了！",
    body: "您在 <strong>{{store}}</strong> 购物车中的商品仍为您保留。用折扣价拿下母亲节礼物吧。",
    button: "用 {{discount}}% 折扣拿下礼物 →",
    subject: "💐 母亲节：您挑选的礼物享 {{discount}}% 折扣",
    countdown: "母亲节优惠结束倒计时",
  },
  fathersDay: {
    banner: "👔 父亲节 — 专属优惠",
    greeting: "{{name}}，送给爸爸的礼物还在购物车！",
    body: "我们为您保留了 <strong>{{store}}</strong> 购物车中的商品，并附上父亲节折扣。",
    button: "用 {{discount}}% 折扣拿下礼物 →",
    subject: "👔 父亲节：购物车商品 {{discount}}% 折扣",
    countdown: "父亲节优惠结束倒计时",
  },
  valentines: {
    banner: "❤️ 情人节 — 双人优惠",
    greeting: "{{name}}，给心爱的人一个惊喜 ❤️",
    body: "您在 <strong>{{store}}</strong> 购物车中的商品已附上情人节折扣。",
    button: "用 {{discount}}% 折扣拿下 →",
    subject: "❤️ 情人节：购物车商品 {{discount}}% 折扣",
    countdown: "情人节优惠结束倒计时",
  },
  childrensDay: {
    banner: "🎈 儿童节 — 专属折扣",
    greeting: "{{name}}，欢乐正在等着您！",
    body: "您在 <strong>{{store}}</strong> 购物车中的商品享有儿童节折扣。",
    button: "用 {{discount}}% 折扣拿下 →",
    subject: "🎈 儿童节：购物车商品 {{discount}}% 折扣",
    countdown: "儿童节优惠结束倒计时",
  },
  lastChance: {
    banner: "⚠️ 最后机会 — 您的购物车今天到期",
    greeting: "{{name}}，您的购物车今天到期！",
    body: "我们保留了您在 <strong>{{store}}</strong> 购物车中的商品，但折扣只能保留到今天结束。",
    button: "用 {{discount}}% 折扣结账 →",
    subject: "⚠️ 最后机会：{{discount}}% 折扣今天到期",
    countdown: "您的折扣到期倒计时",
  },
};

export const CAMPAIGN_COPY: Record<CampaignCopyLanguage, CampaignCopyMap> = {
  pt: PT,
  en: EN,
  es: ES,
  fr: FR,
  de: DE,
  it: IT,
  nl: NL,
  ja: JA,
  zh: ZH,
};

export function getCampaignCopy(
  campaignId: CampaignCopyId,
  language: CampaignCopyLanguage,
): CampaignCopy {
  return CAMPAIGN_COPY[language][campaignId];
}
