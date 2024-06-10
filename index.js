const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xrsgd45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


// Verify/Validate JWT
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  // console.log(authorization);
  if(!authorization){
    return res.status(401).send({ error: true, message: 'Unauthorized Access' })
  }
  const token = authorization.split(' ')[1]
  console.log(token);
  // Token Verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    req.decoded = decoded
    next()
  })

}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const usersCollection = client.db('melodiousTuneDb').collection('users')



	 // Generate jwt token
   app.post('/jwt', (req, res) => {
    const email = req.body
    console.log(email);
    const token = jwt.sign(email, process.env.ACCESS_SECRET_TOKEN, {expiresIn: '9999999999999d'})
    console.log(token);
    res.send({token})
  })




  // Users related apis
  app.put('/users/:email', async(req, res) => {
    const email = req.params.email
    const user = req.body
    const query = { email: email }
    const option = { upsert: true }
    const updateDoc = {
      $set: user,
    }
    const result = await usersCollection.updateOne(query, updateDoc, option)
    console.log(result);
    res.send(result)
  })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
	res.send('Melodious Tune is Tuning')
})

app.listen(port, () => {
	console.log(`Melodious Tune is Tuning on port ${port}`);
})