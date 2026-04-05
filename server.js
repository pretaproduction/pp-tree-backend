require("dotenv").config();

const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔥 FIREBASE
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔑 RAZORPAY (SECURE - FROM .env)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// 🧾 CREATE ORDER
app.post("/create-order", async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 19900, // ₹199
      currency: "INR",
    });

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating order");
  }
});

// 🔥 WEBHOOK (AUTO ACCESS)
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

// 🌐 PORT SUPPORT (IMPORTANT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(🔥 Server running on port ${PORT});
});