import { ethers } from "ethers";
import React, { useState, useEffect } from "react";
import axios from "axios";
import NFT from "../config/contracts/TimeTravellersNFT.json";
import nftAddress from "../config/contracts/map.json";

function Calendar({ provider }) {
  const [allTweets, setAllTweets] = useState([]);
  const allURLs = [];
  const [finishedImageURL, setFinishedImageURL] = useState([]);
  const NFTContract = new ethers.Contract(
    nftAddress[4].TimeTravellersNFT,
    NFT.abi,
    provider
  );
  async function grabJSONInfo() {
    const myJsons = [];
    try {
      await Promise.all(
        allURLs.map(async (index) => {
          const result = await axios.get(index);
          myJsons.push(result);
        })
      );
    } catch (error) {
      // eslint-disable-next-line
      console.log(
        `Error while fetching the JSON's for the tweets from IPFS ${error}`
      );
    }
    const myImages = [];
    myJsons.map((index) => myImages.push(index.data.image));
    const finishedURLForImages = [];
    myImages.map((index) =>
      finishedURLForImages.push(`https://gateway.pinata.cloud/ipfs/${index}`)
    );
    setFinishedImageURL(finishedURLForImages);
  }
  function buildAllURLs() {
    // for testing purposes hardcoded two extra hashes
    /* const arrayOfTokenURIs = [
      "QmYxChr2VZ7RXgK9vjEPz7rpfZH19GqK1uT7g7tHK9oFr9",
      "QmYxChr2VZ7RXgK9vjEPz7rpfZH19GqK1uT7g7tHK9oFr9",
    ]; */
    const arrayOfTokenURIs = [];
    allTweets.map((index) => {
      arrayOfTokenURIs.push(index.tokenURI.substring(7));
      return allURLs;
    });

    for (let i = 0; i < arrayOfTokenURIs.length; i++) {
      allURLs.push(`https://gateway.pinata.cloud/ipfs/${arrayOfTokenURIs[i]}`);
    }
    grabJSONInfo();
  }

  async function fetchAllTweets() {
    const result = await NFTContract.getAllMintedTokens();
    setAllTweets(result);
  }
  useEffect(() => {
    buildAllURLs();
  }, [allTweets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    NFTContract.on("TokenCreated", () => {
      fetchAllTweets();
    });
    return () => {
      NFTContract.removeListener("TokenCreated", () => {
        fetchAllTweets();
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Only runs once, first load
  useEffect(() => {
    fetchAllTweets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function mintToken() {
    const signer = provider.getSigner();
    const NFTSignerContract = new ethers.Contract(
      nftAddress[4].TimeTravellersNFT,
      NFT.abi,
      signer
    );
    await NFTSignerContract.mintTweet(
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "https://twitter.com/BinanceUS/status/1499457941510004745"
    );
  }
  // -----
  return (
    <div>
      <button type="button" onClick={(e) => fetchAllTweets(e)}>
        fetch All tweets
      </button>
      <button type="button" onClick={(e) => mintToken(e)}>
        mint Token
      </button>
      <button type="button" onClick={(e) => buildAllURLs(e)}>
        build URLs
      </button>
      <br />
      Calendar
      <div>
        {allTweets.map((index, i) => (
          <div key={index.tokenID}>
            {index.tokenID}
            <br />
            <img width="300px" alt="tweets" src={finishedImageURL[i]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Calendar;
