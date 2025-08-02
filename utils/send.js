export async function send(number, message) {
    const url = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: number,
      type: "text",
      text: {
        body: message
      }
    };
  
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp API Error: ${err}`);
    }
  
    return await res.json();
  }
  