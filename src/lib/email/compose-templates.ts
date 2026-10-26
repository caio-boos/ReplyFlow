/**
 * Templates prontos do "Compor E-mail". Os placeholders são preenchidos com
 * os dados do pedido buscado na Shopify antes de preencher o formulário.
 *
 * O conteúdo (assunto/corpo) é escolhido pelo idioma da loja
 * (`account.replyLanguage`); quando não há tradução, usa inglês.
 * Nome e descrição ficam em português pois são apenas da interface.
 *
 * Placeholders disponíveis:
 *  {{nome}}          – nome completo do cliente
 *  {{primeiro_nome}} – primeiro nome do cliente
 *  {{pedido}}        – número do pedido (ex.: #2361)
 *  {{itens}}         – lista dos itens do pedido
 *  {{loja}}          – nome da loja
 *  {{rastreio}}      – código de rastreio
 *  {{link_rastreio}} – link de rastreamento
 *  {{endereco}}      – endereço de entrega registrado
 *  {{total}}         – valor total do pedido
 */

export interface TemplateContent {
  subject: string;
  body: string;
}

export interface ComposeTemplate {
  id: string;
  name: string;
  description: string;
  /** Conteúdo por idioma ("en" é obrigatório e usado como fallback). */
  content: Record<string, TemplateContent> & { en: TemplateContent };
}

export const COMPOSE_TEMPLATES: ComposeTemplate[] = [
  {
    id: "endereco-urgente",
    name: "Fornecer endereço com urgência",
    description: "Pede ao cliente o endereço completo para liberar o envio.",
    content: {
      en: {
        subject: "⚠️ Order {{pedido}} — We urgently need your address",
        body: `Hello {{primeiro_nome}},

This is the {{loja}} team.

Your order {{pedido}} ({{itens}}) is ready to ship, but we URGENTLY need you to confirm your full address so the delivery isn't delayed or returned.

Please reply to this email with:
• Street and number
• Apartment/unit (if any)
• City / State
• ZIP / Postal code

Address we currently have on file:
{{endereco}}

As soon as we receive your confirmation, we'll ship it right away.

Best regards,
{{loja}} Team`,
      },
      pt: {
        subject: "⚠️ Pedido {{pedido}} — Precisamos do seu endereço com urgência",
        body: `Olá {{primeiro_nome}},

Tudo bem? Somos da equipe {{loja}}.

Estamos com o seu pedido {{pedido}} ({{itens}}) pronto para envio, porém precisamos que você nos confirme o seu endereço completo COM URGÊNCIA para que a entrega não seja atrasada ou devolvida.

Por favor, responda este e-mail com:
• Rua e número
• Complemento (apto/bloco, se houver)
• Bairro
• Cidade / Estado
• CEP

Endereço que temos registrado:
{{endereco}}

Assim que recebermos a confirmação, liberamos o envio imediatamente.

Atenciosamente,
Equipe {{loja}}`,
      },
      es: {
        subject: "⚠️ Pedido {{pedido}} — Necesitamos tu dirección con urgencia",
        body: `Hola {{primeiro_nome}},

Somos el equipo de {{loja}}.

Tu pedido {{pedido}} ({{itens}}) está listo para enviarse, pero necesitamos que confirmes tu dirección completa CON URGENCIA para que la entrega no se retrase ni sea devuelta.

Por favor, responde a este correo con:
• Calle y número
• Piso/departamento (si aplica)
• Ciudad / Provincia
• Código postal

Dirección que tenemos registrada:
{{endereco}}

En cuanto recibamos tu confirmación, enviaremos el pedido de inmediato.

Saludos cordiales,
Equipo {{loja}}`,
      },
      fr: {
        subject: "⚠️ Commande {{pedido}} — Nous avons besoin de votre adresse en urgence",
        body: `Bonjour {{primeiro_nome}},

Ici l'équipe {{loja}}.

Votre commande {{pedido}} ({{itens}}) est prête à être expédiée, mais nous avons besoin que vous confirmiez votre adresse complète EN URGENCE afin que la livraison ne soit ni retardée ni retournée.

Merci de répondre à cet e-mail avec :
• Rue et numéro
• Complément (appartement, bâtiment, si applicable)
• Ville / Région
• Code postal

Adresse actuellement enregistrée :
{{endereco}}

Dès réception de votre confirmation, nous expédierons votre commande immédiatement.

Cordialement,
L'équipe {{loja}}`,
      },
      de: {
        subject: "⚠️ Bestellung {{pedido}} — Wir benötigen dringend Ihre Adresse",
        body: `Hallo {{primeiro_nome}},

hier ist das Team von {{loja}}.

Ihre Bestellung {{pedido}} ({{itens}}) ist versandbereit, aber wir benötigen DRINGEND die Bestätigung Ihrer vollständigen Adresse, damit sich die Lieferung nicht verzögert oder zurückgeschickt wird.

Bitte antworten Sie auf diese E-Mail mit:
• Straße und Hausnummer
• Zusatz (Wohnung/Etage, falls vorhanden)
• Stadt / Bundesland
• Postleitzahl

Derzeit hinterlegte Adresse:
{{endereco}}

Sobald wir Ihre Bestätigung erhalten, versenden wir sofort.

Mit freundlichen Grüßen
Ihr {{loja}}-Team`,
      },
      it: {
        subject: "⚠️ Ordine {{pedido}} — Abbiamo urgentemente bisogno del tuo indirizzo",
        body: `Ciao {{primeiro_nome}},

siamo il team di {{loja}}.

Il tuo ordine {{pedido}} ({{itens}}) è pronto per la spedizione, ma abbiamo URGENTEMENTE bisogno che tu confermi il tuo indirizzo completo affinché la consegna non venga ritardata o restituita.

Per favore, rispondi a questa e-mail con:
• Via e numero civico
• Interno/scala (se presente)
• Città / Provincia
• CAP

Indirizzo attualmente registrato:
{{endereco}}

Non appena riceveremo la tua conferma, spediremo immediatamente.

Cordiali saluti,
Team {{loja}}`,
      },
      nl: {
        subject: "⚠️ Bestelling {{pedido}} — We hebben dringend uw adres nodig",
        body: `Hallo {{primeiro_nome}},

Dit is het team van {{loja}}.

Uw bestelling {{pedido}} ({{itens}}) staat klaar voor verzending, maar we hebben DRINGEND een bevestiging van uw volledige adres nodig zodat de levering niet vertraagd of geretourneerd wordt.

Beantwoord deze e-mail alstublieft met:
• Straat en huisnummer
• Toevoeging (appartement/verdieping, indien van toepassing)
• Stad / Provincie
• Postcode

Adres dat momenteel bij ons bekend is:
{{endereco}}

Zodra we uw bevestiging ontvangen, verzenden we direct.

Met vriendelijke groet,
Team {{loja}}`,
      },
      ja: {
        subject: "⚠️ ご注文{{pedido}} — 至急ご住所の確認をお願いいたします",
        body: `{{primeiro_nome}} 様

いつもご利用いただきありがとうございます。{{loja}}カスタマーサポートです。

ご注文{{pedido}}（{{itens}}）は発送準備が整っておりますが、配送の遅延や返送を防ぐため、至急、正確なご住所の確認が必要です。

お手数ですが、本メールにご返信の上、以下の情報をお知らせください：
• 都道府県・市区町村
• 番地・建物名・部屋番号
• 郵便番号
• お電話番号（任意）

現在登録されているご住所：
{{endereco}}

ご確認いただき次第、すぐに発送いたします。

何卒よろしくお願いいたします。
{{loja}} カスタマーサポート`,
      },
      zh: {
        subject: "⚠️ 订单{{pedido}} — 请尽快确认您的收货地址",
        body: `{{primeiro_nome}} 您好，

我们是{{loja}}客服团队。

您的订单{{pedido}}（{{itens}}）已准备好发货，但我们急需您确认完整的收货地址，以免配送延误或包裹被退回。

请回复本邮件并提供以下信息：
• 街道及门牌号
• 单元/楼层（如有）
• 城市 / 省份
• 邮政编码

目前登记的地址：
{{endereco}}

收到您的确认后，我们将立即安排发货。

祝好，
{{loja}} 团队`,
      },
    },
  },
  {
    id: "confirmar-endereco",
    name: "Confirmar endereço de entrega",
    description: "Pede a confirmação do endereço registrado no pedido.",
    content: {
      en: {
        subject: "Order {{pedido}} — Please confirm your shipping address",
        body: `Hello {{primeiro_nome}},

This is the {{loja}} team. Before we ship your order {{pedido}}, we'd like to confirm the shipping address on file:

{{endereco}}

Is everything correct? If anything needs to be updated, just reply to this email with the correct address.

Best regards,
{{loja}} Team`,
      },
      pt: {
        subject: "Pedido {{pedido}} — Confirme seu endereço de entrega",
        body: `Olá {{primeiro_nome}},

Aqui é da equipe {{loja}}. Antes de enviarmos o seu pedido {{pedido}}, gostaríamos de confirmar o endereço de entrega registrado:

{{endereco}}

Está tudo certo? Se precisar corrigir algo, basta responder este e-mail com o endereço atualizado.

Atenciosamente,
Equipe {{loja}}`,
      },
      es: {
        subject: "Pedido {{pedido}} — Confirma tu dirección de envío",
        body: `Hola {{primeiro_nome}},

Somos el equipo de {{loja}}. Antes de enviar tu pedido {{pedido}}, queremos confirmar la dirección de envío registrada:

{{endereco}}

¿Está todo correcto? Si necesitas corregir algo, responde a este correo con la dirección actualizada.

Saludos cordiales,
Equipo {{loja}}`,
      },
      fr: {
        subject: "Commande {{pedido}} — Confirmez votre adresse de livraison",
        body: `Bonjour {{primeiro_nome}},

Ici l'équipe {{loja}}. Avant d'expédier votre commande {{pedido}}, nous aimerions confirmer l'adresse de livraison enregistrée :

{{endereco}}

Tout est correct ? Si quelque chose doit être modifié, répondez simplement à cet e-mail avec l'adresse mise à jour.

Cordialement,
L'équipe {{loja}}`,
      },
      de: {
        subject: "Bestellung {{pedido}} — Bitte bestätigen Sie Ihre Lieferadresse",
        body: `Hallo {{primeiro_nome}},

hier ist das Team von {{loja}}. Bevor wir Ihre Bestellung {{pedido}} versenden, möchten wir die hinterlegte Lieferadresse bestätigen:

{{endereco}}

Ist alles korrekt? Falls etwas geändert werden muss, antworten Sie einfach auf diese E-Mail mit der aktualisierten Adresse.

Mit freundlichen Grüßen
Ihr {{loja}}-Team`,
      },
      it: {
        subject: "Ordine {{pedido}} — Conferma il tuo indirizzo di spedizione",
        body: `Ciao {{primeiro_nome}},

siamo il team di {{loja}}. Prima di spedire il tuo ordine {{pedido}}, vorremmo confermare l'indirizzo di spedizione registrato:

{{endereco}}

È tutto corretto? Se devi correggere qualcosa, rispondi a questa e-mail con l'indirizzo aggiornato.

Cordiali saluti,
Team {{loja}}`,
      },
      nl: {
        subject: "Bestelling {{pedido}} — Bevestig uw bezorgadres",
        body: `Hallo {{primeiro_nome}},

Dit is het team van {{loja}}. Voordat we uw bestelling {{pedido}} verzenden, willen we graag het geregistreerde bezorgadres bevestigen:

{{endereco}}

Klopt alles? Als er iets gewijzigd moet worden, beantwoord dan deze e-mail met het bijgewerkte adres.

Met vriendelijke groet,
Team {{loja}}`,
      },
      ja: {
        subject: "ご注文{{pedido}} — お届け先住所のご確認のお願い",
        body: `{{primeiro_nome}} 様

{{loja}}カスタマーサポートです。ご注文{{pedido}}の発送前に、登録されているお届け先住所の確認をお願いしたくご連絡いたしました。

{{endereco}}

上記の内容でお間違いないでしょうか？変更が必要な場合は、本メールにご返信の上、正しいご住所をお知らせください。

何卒よろしくお願いいたします。
{{loja}} カスタマーサポート`,
      },
      zh: {
        subject: "订单{{pedido}} — 请确认您的收货地址",
        body: `{{primeiro_nome}} 您好，

我们是{{loja}}客服团队。在发货前，我们想与您确认订单{{pedido}}的收货地址：

{{endereco}}

以上信息是否正确？如需修改，请回复本邮件告知最新地址。

祝好，
{{loja}} 团队`,
      },
    },
  },
  {
    id: "enviar-rastreio",
    name: "Enviar código de rastreio",
    description: "Informa o código e o link de rastreamento do pedido.",
    content: {
      en: {
        subject: "Order {{pedido}} shipped — track your package 📦",
        body: `Hello {{primeiro_nome}},

Great news! Your order {{pedido}} ({{itens}}) is on its way. 🎉

Tracking number: {{rastreio}}
Track it here: {{link_rastreio}}

If you have any questions, just reply to this email.

Best regards,
{{loja}} Team`,
      },
      pt: {
        subject: "Pedido {{pedido}} enviado — acompanhe seu rastreio 📦",
        body: `Olá {{primeiro_nome}},

Boas notícias! Seu pedido {{pedido}} ({{itens}}) já está a caminho. 🎉

Código de rastreio: {{rastreio}}
Acompanhe aqui: {{link_rastreio}}

Qualquer dúvida é só responder este e-mail.

Atenciosamente,
Equipe {{loja}}`,
      },
      es: {
        subject: "Pedido {{pedido}} enviado — sigue tu paquete 📦",
        body: `Hola {{primeiro_nome}},

¡Buenas noticias! Tu pedido {{pedido}} ({{itens}}) ya está en camino. 🎉

Número de seguimiento: {{rastreio}}
Síguelo aquí: {{link_rastreio}}

Si tienes cualquier duda, solo responde a este correo.

Saludos cordiales,
Equipo {{loja}}`,
      },
      fr: {
        subject: "Commande {{pedido}} expédiée — suivez votre colis 📦",
        body: `Bonjour {{primeiro_nome}},

Bonne nouvelle ! Votre commande {{pedido}} ({{itens}}) est en route. 🎉

Numéro de suivi : {{rastreio}}
Suivez-la ici : {{link_rastreio}}

Pour toute question, répondez simplement à cet e-mail.

Cordialement,
L'équipe {{loja}}`,
      },
      de: {
        subject: "Bestellung {{pedido}} versandt — verfolgen Sie Ihr Paket 📦",
        body: `Hallo {{primeiro_nome}},

gute Nachrichten! Ihre Bestellung {{pedido}} ({{itens}}) ist unterwegs. 🎉

Sendungsnummer: {{rastreio}}
Hier verfolgen: {{link_rastreio}}

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr {{loja}}-Team`,
      },
      it: {
        subject: "Ordine {{pedido}} spedito — traccia il tuo pacco 📦",
        body: `Ciao {{primeiro_nome}},

ottime notizie! Il tuo ordine {{pedido}} ({{itens}}) è in viaggio. 🎉

Codice di tracciamento: {{rastreio}}
Traccialo qui: {{link_rastreio}}

Per qualsiasi domanda, rispondi pure a questa e-mail.

Cordiali saluti,
Team {{loja}}`,
      },
      nl: {
        subject: "Bestelling {{pedido}} verzonden — volg uw pakket 📦",
        body: `Hallo {{primeiro_nome}},

Goed nieuws! Uw bestelling {{pedido}} ({{itens}}) is onderweg. 🎉

Track & trace-code: {{rastreio}}
Volg uw pakket hier: {{link_rastreio}}

Heeft u vragen? Beantwoord dan gewoon deze e-mail.

Met vriendelijke groet,
Team {{loja}}`,
      },
      ja: {
        subject: "ご注文{{pedido}}を発送いたしました — 配送状況のご確認 📦",
        body: `{{primeiro_nome}} 様

{{loja}}カスタマーサポートです。ご注文{{pedido}}（{{itens}}）を発送いたしました。🎉

追跡番号：{{rastreio}}
配送状況はこちらからご確認いただけます：{{link_rastreio}}

ご不明な点がございましたら、本メールにご返信ください。

何卒よろしくお願いいたします。
{{loja}} カスタマーサポート`,
      },
      zh: {
        subject: "订单{{pedido}}已发货 — 跟踪您的包裹 📦",
        body: `{{primeiro_nome}} 您好，

好消息！您的订单{{pedido}}（{{itens}}）已在途中。🎉

物流单号：{{rastreio}}
点击这里跟踪：{{link_rastreio}}

如有任何疑问，请直接回复本邮件。

祝好，
{{loja}} 团队`,
      },
    },
  },
  {
    id: "atraso-entrega",
    name: "Pedido atrasado — desculpas",
    description: "Pede desculpas pelo atraso e tranquiliza o cliente.",
    content: {
      en: {
        subject: "About your order {{pedido}} — delivery update",
        body: `Hello {{primeiro_nome}},

This is the {{loja}} team. We're closely monitoring your order {{pedido}} and noticed the delivery is taking longer than expected.

We apologize for the inconvenience — we're already checking with the carrier and your order is still in transit.

Tracking number: {{rastreio}}
Track it here: {{link_rastreio}}

If you have any questions, we're here to help.

Best regards,
{{loja}} Team`,
      },
      pt: {
        subject: "Sobre o seu pedido {{pedido}} — atualização de entrega",
        body: `Olá {{primeiro_nome}},

Somos da equipe {{loja}}. Estamos acompanhando de perto o seu pedido {{pedido}} e notamos que a entrega está demorando mais que o previsto.

Pedimos desculpas pelo transtorno — já estamos verificando com a transportadora e seu pedido continua em trânsito.

Código de rastreio: {{rastreio}}
Acompanhe aqui: {{link_rastreio}}

Caso tenha qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe {{loja}}`,
      },
      es: {
        subject: "Sobre tu pedido {{pedido}} — actualización de entrega",
        body: `Hola {{primeiro_nome}},

Somos el equipo de {{loja}}. Estamos siguiendo de cerca tu pedido {{pedido}} y notamos que la entrega está tardando más de lo previsto.

Lamentamos las molestias — ya estamos verificando con la transportista y tu pedido sigue en tránsito.

Número de seguimiento: {{rastreio}}
Síguelo aquí: {{link_rastreio}}

Si tienes cualquier duda, estamos a tu disposición.

Saludos cordiales,
Equipo {{loja}}`,
      },
      fr: {
        subject: "À propos de votre commande {{pedido}} — mise à jour de livraison",
        body: `Bonjour {{primeiro_nome}},

Ici l'équipe {{loja}}. Nous suivons de près votre commande {{pedido}} et avons remarqué que la livraison prend plus de temps que prévu.

Nous nous excusons pour ce désagrément — nous vérifions déjà auprès du transporteur et votre commande est toujours en transit.

Numéro de suivi : {{rastreio}}
Suivez-la ici : {{link_rastreio}}

Pour toute question, nous restons à votre disposition.

Cordialement,
L'équipe {{loja}}`,
      },
      de: {
        subject: "Zu Ihrer Bestellung {{pedido}} — Lieferupdate",
        body: `Hallo {{primeiro_nome}},

hier ist das Team von {{loja}}. Wir beobachten Ihre Bestellung {{pedido}} genau und haben festgestellt, dass die Lieferung länger dauert als erwartet.

Wir entschuldigen uns für die Unannehmlichkeiten — wir klären das bereits mit dem Versanddienstleister und Ihre Bestellung ist weiterhin unterwegs.

Sendungsnummer: {{rastreio}}
Hier verfolgen: {{link_rastreio}}

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr {{loja}}-Team`,
      },
      it: {
        subject: "Sul tuo ordine {{pedido}} — aggiornamento sulla consegna",
        body: `Ciao {{primeiro_nome}},

siamo il team di {{loja}}. Stiamo seguendo da vicino il tuo ordine {{pedido}} e abbiamo notato che la consegna sta richiedendo più tempo del previsto.

Ci scusiamo per il disagio — stiamo già verificando con il corriere e il tuo ordine è ancora in transito.

Codice di tracciamento: {{rastreio}}
Traccialo qui: {{link_rastreio}}

Per qualsiasi domanda, siamo a tua disposizione.

Cordiali saluti,
Team {{loja}}`,
      },
      nl: {
        subject: "Over uw bestelling {{pedido}} — bezorgupdate",
        body: `Hallo {{primeiro_nome}},

Dit is het team van {{loja}}. We volgen uw bestelling {{pedido}} op de voet en hebben gemerkt dat de bezorging langer duurt dan verwacht.

Onze excuses voor het ongemak — we zijn dit al aan het navragen bij de vervoerder en uw bestelling is nog steeds onderweg.

Track & trace-code: {{rastreio}}
Volg uw pakket hier: {{link_rastreio}}

Heeft u vragen? We helpen u graag.

Met vriendelijke groet,
Team {{loja}}`,
      },
      ja: {
        subject: "ご注文{{pedido}}について — 配送状況のお知らせ",
        body: `{{primeiro_nome}} 様

{{loja}}カスタマーサポートです。ご注文{{pedido}}の配送状況を確認しておりますが、お届けまでに予定より時間がかかっております。

ご不便をおかけし誠に申し訳ございません。現在、配送業者に確認を進めており、お荷物は輸送中でございます。

追跡番号：{{rastreio}}
配送状況はこちらからご確認いただけます：{{link_rastreio}}

ご不明な点がございましたら、お気軽にお問い合わせください。

何卒よろしくお願いいたします。
{{loja}} カスタマーサポート`,
      },
      zh: {
        subject: "关于您的订单{{pedido}} — 配送进度更新",
        body: `{{primeiro_nome}} 您好，

我们是{{loja}}客服团队。我们一直在密切关注您的订单{{pedido}}，发现配送时间比预期要长。

对于由此带来的不便，我们深表歉意 — 我们已在与承运方核实，您的包裹仍在运输途中。

物流单号：{{rastreio}}
点击这里跟踪：{{link_rastreio}}

如有任何疑问，我们随时为您服务。

祝好，
{{loja}} 团队`,
      },
    },
  },
  {
    id: "pagamento-pendente",
    name: "Pagamento pendente",
    description: "Avisa que o pagamento do pedido ainda não foi confirmado.",
    content: {
      en: {
        subject: "Order {{pedido}} — payment pending",
        body: `Hello {{primeiro_nome}},

This is the {{loja}} team. We noticed the payment for your order {{pedido}} ({{itens}}) hasn't been confirmed yet.

To secure your purchase, please complete the payment as soon as possible. If you've already paid, please disregard this email or send us the receipt so we can speed things up.

If you have any questions, just reply.

Best regards,
{{loja}} Team`,
      },
      pt: {
        subject: "Pedido {{pedido}} — pagamento pendente",
        body: `Olá {{primeiro_nome}},

Aqui é da equipe {{loja}}. Identificamos que o pagamento do seu pedido {{pedido}} ({{itens}}) ainda não foi confirmado.

Para garantir sua compra, finalize o pagamento o quanto antes. Se você já pagou, por favor desconsidere este e-mail ou nos envie o comprovante para agilizarmos a liberação.

Qualquer dúvida é só responder.

Atenciosamente,
Equipe {{loja}}`,
      },
      es: {
        subject: "Pedido {{pedido}} — pago pendiente",
        body: `Hola {{primeiro_nome}},

Somos el equipo de {{loja}}. Hemos detectado que el pago de tu pedido {{pedido}} ({{itens}}) aún no se ha confirmado.

Para asegurar tu compra, completa el pago lo antes posible. Si ya pagaste, ignora este correo o envíanos el comprobante para agilizar el proceso.

Si tienes cualquier duda, solo responde.

Saludos cordiales,
Equipo {{loja}}`,
      },
      fr: {
        subject: "Commande {{pedido}} — paiement en attente",
        body: `Bonjour {{primeiro_nome}},

Ici l'équipe {{loja}}. Nous avons constaté que le paiement de votre commande {{pedido}} ({{itens}}) n'a pas encore été confirmé.

Pour garantir votre achat, veuillez finaliser le paiement dès que possible. Si vous avez déjà payé, ignorez cet e-mail ou envoyez-nous le justificatif pour accélérer le traitement.

Pour toute question, répondez simplement à cet e-mail.

Cordialement,
L'équipe {{loja}}`,
      },
      de: {
        subject: "Bestellung {{pedido}} — Zahlung ausstehend",
        body: `Hallo {{primeiro_nome}},

hier ist das Team von {{loja}}. Wir haben festgestellt, dass die Zahlung für Ihre Bestellung {{pedido}} ({{itens}}) noch nicht bestätigt wurde.

Um Ihren Kauf zu sichern, schließen Sie die Zahlung bitte so bald wie möglich ab. Falls Sie bereits bezahlt haben, ignorieren Sie diese E-Mail oder senden Sie uns den Beleg, damit wir die Freigabe beschleunigen können.

Bei Fragen antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr {{loja}}-Team`,
      },
      it: {
        subject: "Ordine {{pedido}} — pagamento in sospeso",
        body: `Ciao {{primeiro_nome}},

siamo il team di {{loja}}. Abbiamo notato che il pagamento del tuo ordine {{pedido}} ({{itens}}) non è ancora stato confermato.

Per assicurarti l'acquisto, completa il pagamento il prima possibile. Se hai già pagato, ignora questa e-mail o inviaci la ricevuta per velocizzare la procedura.

Per qualsiasi domanda, rispondi pure.

Cordiali saluti,
Team {{loja}}`,
      },
      nl: {
        subject: "Bestelling {{pedido}} — betaling in afwachting",
        body: `Hallo {{primeiro_nome}},

Dit is het team van {{loja}}. We hebben gemerkt dat de betaling van uw bestelling {{pedido}} ({{itens}}) nog niet is bevestigd.

Rond de betaling zo snel mogelijk af om uw aankoop veilig te stellen. Heeft u al betaald? Negeer deze e-mail dan of stuur ons het betaalbewijs zodat we het sneller kunnen verwerken.

Heeft u vragen? Beantwoord dan gewoon deze e-mail.

Met vriendelijke groet,
Team {{loja}}`,
      },
      ja: {
        subject: "ご注文{{pedido}} — お支払いが未確認です",
        body: `{{primeiro_nome}} 様

{{loja}}カスタマーサポートです。ご注文{{pedido}}（{{itens}}）のお支払いがまだ確認できておりません。

ご購入を確定するため、お早めにお支払いのお手続きをお願いいたします。すでにお支払い済みの場合は、本メールは破棄していただくか、お支払いの控えをお送りいただければ迅速に確認いたします。

ご不明な点がございましたら、本メールにご返信ください。

何卒よろしくお願いいたします。
{{loja}} カスタマーサポート`,
      },
      zh: {
        subject: "订单{{pedido}} — 付款待确认",
        body: `{{primeiro_nome}} 您好，

我们是{{loja}}客服团队。我们注意到您的订单{{pedido}}（{{itens}}）的付款尚未确认。

为确保您的购买，请尽快完成付款。如果您已付款，请忽略本邮件，或将付款凭证发送给我们以便加快处理。

如有任何疑问，请直接回复。

祝好，
{{loja}} 团队`,
      },
    },
  },
  {
    id: "pos-venda",
    name: "Pós-venda — tudo certo com o pedido?",
    description: "Pergunta ao cliente se o pedido chegou bem.",
    content: {
      en: {
        subject: "{{primeiro_nome}}, is everything OK with order {{pedido}}?",
        body: `Hello {{primeiro_nome}},

This is the {{loja}} team! We'd love to know: did your order {{pedido}} ({{itens}}) arrive safely?

If you have any issue or question, reply to this email and we'll sort it out right away. 😊

Thank you for your trust!

Best regards,
{{loja}} Team`,
      },
      pt: {
        subject: "{{primeiro_nome}}, tudo certo com o pedido {{pedido}}?",
        body: `Olá {{primeiro_nome}},

Aqui é da equipe {{loja}}! Queremos saber: seu pedido {{pedido}} ({{itens}}) chegou direitinho?

Se tiver qualquer problema ou dúvida, responda este e-mail que resolvemos rapidinho. 😊

Obrigado pela confiança!

Atenciosamente,
Equipe {{loja}}`,
      },
      es: {
        subject: "{{primeiro_nome}}, ¿todo bien con el pedido {{pedido}}?",
        body: `Hola {{primeiro_nome}},

¡Somos el equipo de {{loja}}! Queremos saber: ¿tu pedido {{pedido}} ({{itens}}) llegó bien?

Si tienes algún problema o duda, responde a este correo y lo resolvemos enseguida. 😊

¡Gracias por tu confianza!

Saludos cordiales,
Equipo {{loja}}`,
      },
      fr: {
        subject: "{{primeiro_nome}}, tout va bien avec la commande {{pedido}} ?",
        body: `Bonjour {{primeiro_nome}},

Ici l'équipe {{loja}} ! Nous aimerions savoir : votre commande {{pedido}} ({{itens}}) est-elle bien arrivée ?

En cas de problème ou de question, répondez à cet e-mail et nous nous en occupons immédiatement. 😊

Merci de votre confiance !

Cordialement,
L'équipe {{loja}}`,
      },
      de: {
        subject: "{{primeiro_nome}}, ist mit Bestellung {{pedido}} alles in Ordnung?",
        body: `Hallo {{primeiro_nome}},

hier ist das Team von {{loja}}! Wir möchten wissen: Ist Ihre Bestellung {{pedido}} ({{itens}}) gut angekommen?

Bei Problemen oder Fragen antworten Sie einfach auf diese E-Mail und wir kümmern uns sofort darum. 😊

Vielen Dank für Ihr Vertrauen!

Mit freundlichen Grüßen
Ihr {{loja}}-Team`,
      },
      it: {
        subject: "{{primeiro_nome}}, tutto bene con l'ordine {{pedido}}?",
        body: `Ciao {{primeiro_nome}},

siamo il team di {{loja}}! Vogliamo sapere: il tuo ordine {{pedido}} ({{itens}}) è arrivato bene?

Se hai qualsiasi problema o domanda, rispondi a questa e-mail e lo risolviamo subito. 😊

Grazie per la fiducia!

Cordiali saluti,
Team {{loja}}`,
      },
      nl: {
        subject: "{{primeiro_nome}}, is alles in orde met bestelling {{pedido}}?",
        body: `Hallo {{primeiro_nome}},

Dit is het team van {{loja}}! We willen graag weten: is uw bestelling {{pedido}} ({{itens}}) goed aangekomen?

Heeft u een probleem of vraag? Beantwoord deze e-mail en we lossen het meteen op. 😊

Bedankt voor uw vertrouwen!

Met vriendelijke groet,
Team {{loja}}`,
      },
      ja: {
        subject: "{{primeiro_nome}} 様、ご注文{{pedido}}は無事お手元に届きましたか？",
        body: `{{primeiro_nome}} 様

{{loja}}カスタマーサポートです。ご注文{{pedido}}（{{itens}}）は無事にお手元に届きましたでしょうか？

万が一、問題やご不明な点がございましたら、本メールにご返信ください。すぐに対応いたします。😊

この度はご利用いただき誠にありがとうございました。

何卒よろしくお願いいたします。
{{loja}} カスタマーサポート`,
      },
      zh: {
        subject: "{{primeiro_nome}}，订单{{pedido}}一切顺利吗？",
        body: `{{primeiro_nome}} 您好，

我们是{{loja}}团队！想了解一下：您的订单{{pedido}}（{{itens}}）是否已顺利送达？

如有任何问题或疑问，请回复本邮件，我们会立即为您解决。😊

感谢您的信任！

祝好，
{{loja}} 团队`,
      },
    },
  },
];

/** Normaliza o código do idioma ("pt-BR" → "pt") e resolve o conteúdo do template. */
export function getTemplateContent(
  template: ComposeTemplate,
  replyLanguage: string | null | undefined,
): TemplateContent {
  const lang = (replyLanguage ?? "en").toLowerCase().split("-")[0];
  return template.content[lang] ?? template.content.en;
}

export interface TemplateVars {
  nome: string;
  primeiroNome: string;
  pedido: string;
  itens: string;
  loja: string;
  rastreio: string;
  linkRastreio: string;
  endereco: string;
  total: string;
}

const PLACEHOLDER_KEYS: Record<string, keyof TemplateVars> = {
  nome: "nome",
  primeiro_nome: "primeiroNome",
  pedido: "pedido",
  itens: "itens",
  loja: "loja",
  rastreio: "rastreio",
  link_rastreio: "linkRastreio",
  endereco: "endereco",
  total: "total",
};

export function fillTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const varKey = PLACEHOLDER_KEYS[key];
    if (!varKey) return match;
    const value = vars[varKey];
    return value && value.trim() ? value : "—";
  });
}
