require("dotenv").config();

const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 FIREBASE (FROM ENV)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔑 RAZORPAY
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🧾 CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 19900,
      currency: "INR",
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});

// 🔥 WEBHOOK
app.post("/webhook", async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  const signature = req.headers["x-razorpay-signature"];

  if (expected === signature) {
    try {
      const payment = req.body.payload.payment.entity;

const uid = payment.notes?.uid;

if (uid) {
  await db.collection("users").doc(uid).set(
    {
      hasAccess: true,
      paid: true,
    },
    { merge: true }
  );
}
      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Webhook error");
    }
  } else {
    res.status(400).send("Invalid signature");
  }
});


app.get("/check-access", async (req, res) => {
  const uid = req.query.uid;

  const doc = await db.collection("users").doc(uid).get();

  if (!doc.exists) {
    return res.json({ hasAccess: false });
  }

  res.json({ hasAccess: doc.data().hasAccess || false });
});

// 🌐 PORT FIX
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});