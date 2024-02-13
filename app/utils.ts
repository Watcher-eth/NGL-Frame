import axios from "axios";
export function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
}

export function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hexToRGB(hex: any) {
  let r = 0,
    g = 0,
    b = 0;
  // 3 digits
  if (hex.length == 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  // 6 digits
  else if (hex.length == 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function darkenColor(hex: any, amount: number) {
  let [r, g, b] = hexToRGB(hex);
  if (r && g && b) {
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return rgbToHex(r, g, b);
  }
  return "#FFFFFF";
}

export const issueVcs = async (
  userId: string,
  pollId: string,
  question: string,
  address: string
) => {
  const receiverSubjectData = {
    id: address,
    pollId: pollId,
    question: question,
    receiver: address,
    sender: userId,
  };
  try {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Accept", "*/*");
    myHeaders.append("Authorization", `Bearer ${process.env.DISCO_API_KEY}`);

    var raw = JSON.stringify({
      issuer: "did:web:api.disco.xyz/v1/disco",
      schema:
        "https://raw.githubusercontent.com/discoxyz/disco-schemas/main/json/SuperlativeCredential/1-0-0.json",
      suite: "jwt",
      subjects: [
        {
          subject: receiverSubjectData,
          recipient: address,
          issuanceDate: JSON.stringify(new Date().toString()),
        },
      ],
    });

    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
    };

    fetch("https://api.disco.xyz/v1/credentials/", requestOptions)
      .then((response) => response.text())
      .then((result) => console.log(result))
      .catch((error) => console.log("error", error));
  } catch (error) {
    console.error("Error sending request:", error);
  }
};
