const FormData = require("form-data");
const fetch = require("node-fetch");
const { Readable } = require("stream");
const { PINATA_API_KEY, PINATA_API_SECRET, ENV } = require("./utils/config");

const { getTweetId } = require("./utils/twitter");

const getDates = () => {
  let start = new Date();
  start.setDate(start.getDate());
  start.setUTCHours(0, 0, 0, 0);
  start = start.toISOString();

  let end = new Date();
  end.setDate(end.getDate());
  end.setUTCHours(23, 59, 59, 999);
  end = end.toISOString();

  return { start, end };
};

const getCurrentChoiceNr = async () => {
  const dates = getDates();
  const { start, end } = dates;

  // allow only tweets that were created today TODO: filter for env?
  const metadataFilter = `&metadata[keyvalues]={"date":{"value":"${start}","secondValue":"${end}","op":"between"}}`;

  return fetch(
    // fetch pinned tweets that were pinned and created today
    `https://api.pinata.cloud/data/pinList?status=pinned&pinStart=${start}&pinEnd=${end}${metadataFilter}`,
    {
      method: "GET",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_API_SECRET,
      },
    }
  )
    .then(async (res) => res.json())
    .then((json) => {
      const { rows } = json;
      return rows.length + 1;
    })
    .catch((err) => err);
};

async function uploadToPinata(
  pinataContent,
  fileName,
  isJSON = false,
  tweetURL = "",
  name = "",
  tweetCreatedAt = "",
  address = ""
) {
  const fd = new FormData();
  let imgBuffer;
  let readable;

  if (!isJSON) {
    imgBuffer = Buffer.from(pinataContent, "base64");
    readable = Readable.from(imgBuffer);
    fd.append("file", readable, fileName);

    const choice = await getCurrentChoiceNr();

    fd.append(
      "pinataMetadata",
      JSON.stringify({
        keyvalues: {
          env: ENV,
          date: tweetCreatedAt,
          twitterURL: tweetURL,
          description: name,
          choice: choice,
          walletAddress: address,
        },
      })
    );
  } else {
    fd.append("file", JSON.stringify(pinataContent), fileName);
    fd.append(
      "pinataMetadata",
      JSON.stringify({
        keyvalues: {
          env: ENV,
        },
      })
    );
  }

  return fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET,
    },
    body: fd,
  })
    .then((res) => res.json())
    .then((json) => json.IpfsHash)
    .catch((err) => err);
}

exports.handler = async (event) => {
  const { metadata, imageData, tweetURL, chainId, address } = JSON.parse(
    event.body
  );
  const tweetId = getTweetId(tweetURL);
  const prefix = chainId === 1 ? "" : `${chainId}_`;
  let tokenURI;

  try {
    const tweetCreatedAt = new Date(metadata.attributes[2].value).toISOString();
    // TODO: if second fails revert first one
    const ipfsImagePath = await uploadToPinata(
      imageData,
      `${prefix}${tweetId}.png`,
      false,
      tweetURL,
      metadata.name,
      tweetCreatedAt,
      address
    );

    metadata.image = ipfsImagePath;

    tokenURI = await uploadToPinata(metadata, `${prefix}${tweetId}.json`, true);
  } catch (err) {
    console.log(err);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Could not upload to Pinata",
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      tokenURI: tokenURI,
    }),
  };
};
