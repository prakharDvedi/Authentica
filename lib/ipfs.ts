let ipfsClient: any = null;
let ipfsModule: any = null;

function isPinata(): boolean {
  const apiUrl = process.env.IPFS_API_URL || "";
  return apiUrl.includes("pinata.cloud");
}

async function getIpfsClient() {
  if (isPinata()) {
    return "pinata";
  }

  if (!ipfsClient) {
    try {
      if (!ipfsModule) {
        ipfsModule = await import("ipfs-http-client");
      }
      const { create } = ipfsModule;

      const ipfsApiUrl =
        process.env.IPFS_API_URL || "https://ipfs.infura.io:5001/api/v0";
      const ipfsAuth = process.env.IPFS_AUTH;

      let headers: Record<string, string> | undefined;
      if (ipfsAuth && !ipfsAuth.startsWith("Bearer ")) {
        headers = {
          authorization: `Basic ${Buffer.from(ipfsAuth).toString("base64")}`,
        };
      }

      ipfsClient = create({
        url: ipfsApiUrl,
        headers,
      });
    } catch (error: any) {
      console.error("failed to initialize ipfs client:", error);
      return null;
    }
  }
  return ipfsClient;
}

async function uploadToPinata(
  file: Buffer,
  filename?: string
): Promise<string> {
  const axios = (await import("axios")).default;
  const ipfsAuth = process.env.IPFS_AUTH;

  if (!ipfsAuth || !ipfsAuth.startsWith("Bearer ")) {
    throw new Error("no ipfs auth");
  }

  try {
    const FormData = (await import("form-data")).default;
    const formData = new FormData();
    formData.append("file", file, {
      filename: filename || `proof-${Date.now()}.png`,
      contentType: "image/png",
    });

    const metadata = JSON.stringify({
      name: filename || `proof-${Date.now()}.png`,
    });
    formData.append("pinataMetadata", metadata);

    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append("pinataOptions", options);

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          Authorization: ipfsAuth,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error("pinata upload error:", error);
    if (error.response) {
      console.error("pinata error response:", error.response.data);
      throw new Error(
        `Pinata upload failed: ${error.response.data?.error || error.message}`
      );
    }
    throw new Error(
      `failed to upload to pinata: ${error.message || "Unknown error"}`
    );
  }
}

export async function uploadToIpfs(
  file: Buffer,
  filename?: string
): Promise<string> {
  try {
    const client = await getIpfsClient();

    if (client === "pinata") {
      return await uploadToPinata(file, filename);
    }

    if (!client) {
      throw new Error("IPFS client not available");
    }

    const result = await client.add({
      path: filename || `proof-${Date.now()}`,
      content: file,
    });

    return result.cid.toString();
  } catch (error: any) {
    console.error("ipfs upload error:", error);
    throw new Error(
      `failed to upload to ipfs: ${error.message || "Unknown error"}`
    );
  }
}

async function uploadMetadataToPinata(metadata: object): Promise<string> {
  const axios = (await import("axios")).default;
  const ipfsAuth = process.env.IPFS_AUTH;

  if (!ipfsAuth || !ipfsAuth.startsWith("Bearer ")) {
    throw new Error("no ipfs auth");
  }

  try {
    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        pinataContent: metadata,
        pinataMetadata: {
          name: `metadata-${Date.now()}.json`,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      },
      {
        headers: {
          Authorization: ipfsAuth,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error: any) {
    console.error("pinata metadata upload error:", error);
    if (error.response) {
      console.error("pinata error response:", error.response.data);
      throw new Error(
        `Pinata metadata upload failed: ${
          error.response.data?.error || error.message
        }`
      );
    }
    throw new Error(
      `failed to upload metadata to pinata: ${error.message || "Unknown error"}`
    );
  }
}

export async function uploadMetadataToIpfs(metadata: object): Promise<string> {
  try {
    const client = await getIpfsClient();

    if (client === "pinata") {
      return await uploadMetadataToPinata(metadata);
    }

    if (!client) {
      throw new Error("IPFS client not available");
    }

    const metadataString = JSON.stringify(metadata, null, 2);
    const result = await client.add({
      path: `metadata-${Date.now()}.json`,
      content: Buffer.from(metadataString),
    });

    return result.cid.toString();
  } catch (error: any) {
    console.error("ipfs metadata upload error:", error);
    throw new Error(
      `failed to upload metadata to ipfs: ${error.message || "Unknown error"}`
    );
  }
}

export function getIpfsUrl(cid: string): string {
  if (isPinata()) {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  const gateway = process.env.IPFS_GATEWAY || "https://ipfs.io/ipfs/";
  return `${gateway}${cid}`;
}
