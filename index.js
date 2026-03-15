const { chromium } = require("playwright");
const fetch = require("node-fetch");
const fs = require("fs");
const express = require("express");

const app = express();

const sheetCSV =
"https://docs.google.com/spreadsheets/d/1gxFhMoyVJ4jgNFUrXQ4ue_JdaY-NI1X0Vbni-CHCPzk/export?format=csv&gid=1199880034";

// 投稿する曜日（0=日 1=月 ... 6=土）
const postDays = [1,3,0]; // 月 水 日

// 投稿時間
const postHour = 14;
const postMinute = 17;

// GAS Webhook（あとで自分のURLに変更）
const gasWebhook = "https://script.google.com/macros/s/AKfycbzo1jFM4vXzn6-3OpObB7VDZZNHP4lj0FNTsNVeWUdiyCR3hMs7Qn5IpMdSr3gm9P0O/exec";

// cookiesの読み込み
let cookies;
try {
  if (process.env.COOKIE_DATA) {
    cookies = JSON.parse(process.env.COOKIE_DATA);
    console.log("cookies loaded from environment variable");
  } else {
    throw new Error("Environment variable COOKIE_DATA not found");
  }
} catch (e) {
  console.error("Error loading cookies:", e);
  process.exit(1);
}

let browser;
let context;
let page;

async function startBrowser() {
  browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  context = await browser.newContext();
  await context.addCookies(cookies);

  page = await context.newPage();

  console.log("browser started");
}

async function markPosted(row) {
  try {
    await fetch(gasWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ row: row })
    });
  } catch (e) {
    console.log("GAS update error", e);
  }
}

async function postTweet(tweet) {
  try {
    await page.goto("https://x.com/compose/post", { timeout: 60000 });
    await page.waitForSelector('[role="textbox"]', { timeout: 60000 });
    await page.fill('[role="textbox"]', tweet);
    await page.click('[data-testid="tweetButton"]');
    console.log("投稿成功:", tweet);
  } catch (e) {
    console.log("投稿失敗:", tweet, e);
  }
}

async function runBot(){

try{

const now = new Date();

const day = now.getDay();
const hour = now.getHours();
const minute = now.getMinutes();

// 投稿曜日と時間チェック
if(!postDays.includes(day) || hour !== postHour || minute !== postMinute){
return;
}

const res = await fetch(sheetCSV);
const text = await res.text();
const rows = text.split("\n");

let candidates = [];

for(let i=1;i<rows.length;i++){

const cols = rows[i].split(",");

const tweet = cols[0];
const posted = cols[1];

if(posted !== "YES"){
candidates.push({tweet,row:i+1});
}

}

if(candidates.length === 0){
console.log("投稿できるツイートなし");
return;
}

// ランダム選択
const random = candidates[Math.floor(Math.random()*candidates.length)];

console.log("投稿:",random.tweet);

await postTweet(random.tweet);

await markPosted(random.row);

}catch(e){

console.log("bot error:",e);

}

}

// 起動
startBrowser().then(() => {
  setInterval(runBot, 60000);
});

// Render用Webサーバー
app.get("/", (req, res) => {
  res.send("bot running");
});

app.listen(process.env.PORT || 10000, () => {
  console.log("server started");
});
