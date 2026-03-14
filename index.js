const { chromium } = require("playwright");
const fetch = require("node-fetch");
const fs = require("fs");
const express = require("express");

const app = express();

const sheetCSV =
"https://docs.google.com/spreadsheets/d/1gxFhMoyVJ4jgNFUrXQ4ue_JdaY-NI1X0Vbni-CHCPzk/export?format=csv&gid=1199880034";

// GAS Webhook（あとで自分のURLに変更）
const gasWebhook = "https://script.google.com/macros/s/AKfycbzo1jFM4vXzn6-3OpObB7VDZZNHP4lj0FNTsNVeWUdiyCR3hMs7Qn5IpMdSr3gm9P0O/exec";

// cookies
const cookies = JSON.parse(fs.readFileSync("cookies.json"));

let browser;
let context;
let page;

async function startBrowser(){

browser = await chromium.launch({
  headless:true,
  args:["--no-sandbox","--disable-setuid-sandbox"]
});

context = await browser.newContext();

await context.addCookies(cookies);

page = await context.newPage();

console.log("browser started");

}

async function markPosted(row){

try{

await fetch(gasWebhook,{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
row:row
})
});

}catch(e){
console.log("GAS update error",e);
}

}

async function postTweet(tweet){

try{

await page.goto("https://x.com/compose/post",{timeout:60000});

await page.waitForSelector('[role="textbox"]',{timeout:60000});

await page.fill('[role="textbox"]',tweet);

await page.click('[data-testid="tweetButton"]');

console.log("投稿成功:",tweet);

}catch(e){

console.log("投稿失敗:",tweet);

}

}

async function runBot(){

try{

const res = await fetch(sheetCSV);
const text = await res.text();

const rows = text.split("\n");

const now = new Date();
const time = now.getHours()+":"+String(now.getMinutes()).padStart(2,"0");

for(let i=1;i<rows.length;i++){

const cols = rows[i].split(",");

const tweet = cols[0];
const tweetTime = cols[1];
const posted = cols[2];

if(tweetTime===time && posted!=="YES"){

console.log("投稿予定:",tweet);

await postTweet(tweet);

await markPosted(i+1);

}

}

}catch(e){

console.log("bot error:",e);

}

}

// 起動
startBrowser().then(()=>{

setInterval(runBot,60000);

});

// Render用サーバー
app.get("/",(req,res)=>{
res.send("bot running");
});

app.listen(process.env.PORT || 10000,()=>{
console.log("server started");
});