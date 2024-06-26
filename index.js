const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SK)
const port = process.env.PORT || 5000;


// Middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
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
    // await client.connect();


    const usersCollection = client.db('melodiousTuneDb').collection('users')
    const classesCollection = client.db('melodiousTuneDb').collection('classes')
    const selectedClassesCollection = client.db('melodiousTuneDb').collection('selectedClasses')
    const paymentCollection = client.db('melodiousTuneDb').collection('payment')



	 // Generate jwt token
   app.post('/jwt', (req, res) => {
    const email = req.body
    // console.log(email);
    const token = jwt.sign(email, process.env.ACCESS_SECRET_TOKEN, {expiresIn: '9999999999999d'})
    // console.log(token);
    res.send({token})
  })


// verify Admin
  // const verifyAdmin = async(req, res, next) => {
  //   const email = req.decoded.email;
  //   const query = { email: email }
  //   const user = await usersCollection.findOne(query)
  //   if(user?.role !== 'admin'){
  //     return res.status(403).send({error: true, message: 'Forbidden Access'});
  //   }
  //   next()
  // }


  // Verify Instructor
  // const verifyInstructor = async(req, res, next) => {
  //   const email = req.decoded.email;
  //   const query = { email: email }
  //   const user = await usersCollection.findOne(query)
  //   if(user?.role !== 'Instructor'){
  //     return res.status(403).send({error: true, message: 'Forbidden Access'});
  //   }
  //   next()
  // }




  // Users related apis
  app.get('/users', verifyJWT, async (req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result)
  })

  // Get only Instructors
  app.get('/users/instructors', async (req, res) => {
    const Instructor = req.query.Instructor
    const query = { role: Instructor }
    const result = await usersCollection.find(query).toArray();
    res.send(result)
  })


  app.put('/users/:email', async(req, res) => {
    const email = req.params.email
    const user = req.body
    const query = { email: email }
    const option = { upsert: true }
    const updateDoc = {
      $set: user,
    }
    const result = await usersCollection.updateOne(query, updateDoc, option)
    // console.log(result);
    res.send(result)
  })


  // Create Admin API
  app.patch('/users/admin/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: 'admin'
      },
    };

    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  })



  // DELETE User From Manage Users Page by Admin
  app.delete('/users/:id', verifyJWT, async (req, res) => {
    const id = req.params.id

    const query = { _id: new ObjectId(id) }

    result = usersCollection.deleteOne(query);
    res.send(result);
  })





  // Create Instructor API
  app.patch('/users/instructor/:id', async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = {
      $set: {
        role: 'Instructor'
      },
    };

    const result = await usersCollection.updateOne(filter, updateDoc);
    res.send(result);
  })



    // Create Verify Admin API
    // app.get('/users/admin/:email', verifyJWT, async (req, res) => {
    //   const email = req.params.email;
    //   console.log(email);

    //   if(req.decoded.email !== email){
    //     res.send({ admin: false })
    //   }

    //   const query = { email: email }

    //   const user = await usersCollection.findOne(query);
    //   if(user?.role !== 'admin'){
    //     return res.status(403).send({error: true, message: 'Forbidden Access'});
    // }
    //   const result = { admin: user?.role === 'admin' }
    //   res.send(result);
    // })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    })


    // Create Verify Instructor API
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // let Instructor  = false;
      if (user) {
        Instructor  = user?.role === 'Instructor';
      }
      res.send({ Instructor });
    })





  // --- Classes Related API

      // send Classes to Database
    app.post('/classes', verifyJWT, async(req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass)
      res.send(result)
    })


     // GET specific instructor only classes From database to Client
     app.get('/instructorClasses', async (req, res) => {
      instructorEmail = req.query.instructorEmail
      console.log(instructorEmail);
      filter = { 'instructorInfo.instructorEmail': instructorEmail }
      console.log(filter);
      const result = await classesCollection.find(filter).toArray()
      res.send(result)
    })


    // Get Classes From Database
    app.get('/classes', async (req, res) => {
      // const query = {}
      // const options = {
      //   sort: { 'price': 1 }
      // }

      const sort = req.query.sort;
      const query = {};
      const options = {
        sort: {
          'price': sort === 'asc' ? 1 : -1
        }
      }

      const result = await classesCollection.find(query, options).toArray();
      res.send(result)
    })


    // Get Enrollbased Classes From Database
    app.get('/enrollbasedClasses', async (req, res) => {
      const query = {}
      const options = {
        sort: { 'enrolled': -1 }
      }

      const result = await classesCollection.find(query, options).toArray();
      res.send(result)
    })


    // Delete Classes by instructor
    app.delete('/classes/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await classesCollection.deleteOne(query)
      res.send(result)
    })




    // Created Class status Approved API
    app.patch('/classes/approve/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'Approved'
        }
      }
      const result = await classesCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })



    // Created Class status Denied API
    app.patch('/classes/deny/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'Denied'
        }
      }
      const result = await classesCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })





  // --- selectedClasses Related API

      // POST selectedClasses to database
      app.post('/selectedClasses', verifyJWT, async (req, res) => {
        const selectedClass = req.body;
        console.log(selectedClass);
        const result = await selectedClassesCollection.insertOne(selectedClass);
        res.send(result);
      })


      // GET selectedClasses From database to Client
      app.get('/selectedClasses', verifyJWT, async (req, res) => {
        studentEmail = req.query.studentEmail
        console.log(studentEmail);
        filter = { 'studentInfo.studentEmail': studentEmail }
        console.log(filter);
        const result = await selectedClassesCollection.find(filter).toArray()
        res.send(result)
      })



    // DELETE selectedClass From Selected Class Page
    app.delete('/selectedClasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedClassesCollection.deleteOne(query)
      res.send(result);
    })






  // Payment Related API
    // Create Payment intent
    app.post('/create-payment-intent', verifyJWT, async(req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })



    // Payment Related API
    app.post('/payments', verifyJWT, async (req, res) => {
      try {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);

        const selectedClassIds = payment.selectedClassId.map(id => {
          if (ObjectId.isValid(id)) {
            return new ObjectId(id)
    ;
          } else {
            throw new Error(`Invalid ObjectId: ${id}`);
          }
        });

        const deleteResult = await selectedClassesCollection.deleteMany({ _id: { $in: selectedClassIds } });

        const singleClassIds = payment.singleClassId.map(id => {
          if (ObjectId.isValid(id)) {
            return new ObjectId(id)
    ;
          } else {
            throw new Error(`Invalid ObjectId: ${id}`);
          }
        });

        const updateResults = [];
        for (const classId of singleClassIds) {
          const classData = await classesCollection.findOne({ _id: classId });

          if (!classData) {
            return res.status(404).send({ message: `Class not found: ${classId}` });
          }

          const seats = parseInt(classData.seats);
          const enrolled = parseInt(classData.enrolled);

          // if (isNaN(seats) || isNaN(enrolled)) {
          //   return res.status(400).send({ message: `Invalid numeric value for seats or enrolled for class: ${classId}` });
          // }

          const updateResult = await classesCollection.updateOne({ _id: classId }, {
            $set: {
              seats: seats - 1,
              enrolled: enrolled + 1
            }
          });

          updateResults.push(updateResult);

          if (updateResult.modifiedCount === 0) {
            return res.status(500).send({ message: `Failed to update class enrollment and seats for class: ${classId}` });
          }
        }

        res.send({ insertResult, deleteResult, updateResults });
      } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).send({ message: 'Internal Server Error', error: error.message });
      }
    });


    // GET selectedClasses From database to Client
    app.get('/payments', verifyJWT, async (req, res) => {
      email = req.query.email
      console.log(studentEmail);
      filter = { email: email }
      console.log(filter);
      const result = await paymentCollection.find(filter).toArray()
      res.send(result)
    })


    // DELETE Enrolled Classes from Database
    app.delete('/payments/:id', async (req, res) => {
      const id = req.params.id
      filter = { _id: new ObjectId(id) }
      const result = await paymentCollection.deleteOne(filter)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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





















    // app.post('/payments', verifyJWT, async (req, res) => {
    //   // try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const selectedClassIds = payment.selectedClassId.map(id => {new ObjectId(id)});

    //     const query = { _id: { $in: selectedClassIds } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Ensure the singleClassId is an array of valid ObjectIds
    //     const singleClassIds = payment.singleClassId.map(id => {new ObjectId(id)});

    //     // Update the seats and enrolled fields for each class in the array
    //     // const updateResults = [];
    //     // for (const classId of singleClassIds) {
    //       const classQuery = { _id: singleClassIds };
    //       // const classData = await classesCollection.findOne(classQuery);

    //       // if (!classData) {
    //       //   return res.status(404).send({ message: `Class not found: ${classId}` });
    //       // }

    //       // Log the current values of seats and enrolled
    //       // console.log(`Class ID: ${classId}`);
    //       // console.log(`Current seats: ${classData.seats}`);
    //       // console.log(`Current enrolled: ${classData.enrolled}`);

    //       // Update the seats and enrolled fields
    //       const updateDoc = {
    //         $inc: {
    //           enrolled: 1,
    //           seats: -1
    //         }
    //       };

    //       const updateResults = await classesCollection.updateOne(classQuery, updateDoc);
    //       // updateResults.push(updateResult);

    //       // Log the result of the update operation
    //       // console.log(`Update result for class ${classId}: ${updateResult.matchedCount} document(s) matched, ${updateResult.modifiedCount} document(s) modified`);

    //       // if (updateResult.modifiedCount === 0) {
    //       //   return res.status(500).send({ message: `Failed to update class enrollment and seats for class: ${classId}` });
    //       // }
    //     // }

    //     res.send({ insertResult, deleteResult, updateResults });
    //   // } catch (error) {
    //   //   console.error('Error processing payment:', error);
    //   //   res.status(500).send({ message: 'Internal Server Error', error: error.message });
    //   // }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const selectedClassIds = payment.selectedClassId.map(id => {
    //       if (ObjectId.isValid(id)) {
    //         return new ObjectId(id)
    // ;
    //       } else {
    //         throw new Error(`Invalid ObjectId: ${id}`);
    //       }
    //     });

    //     const query = { _id: { $in: selectedClassIds } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Ensure the singleClassId is an array of valid ObjectIds
    //     const singleClassIds = payment.singleClassId.map(id => {
    //       if (ObjectId.isValid(id)) {
    //         return new ObjectId(id)
    // ;
    //       } else {
    //         throw new Error(`Invalid ObjectId: ${id}`);
    //       }
    //     });

    //     // Update the seats and enrolled fields for each class in the array
    //     const updateResults = [];
    //     for (const classId of singleClassIds) {
    //       const classQuery = { _id: classId };
    //       const classData = await classesCollection.findOne(classQuery);

    //       if (!classData) {
    //         return res.status(404).send({ message: `Class not found: ${classId}` });
    //       }

    //       // Log the current values of seats and enrolled
    //       console.log(`Class ID: ${classId}`);
    //       console.log(`Current seats: ${classData.seats}`);
    //       console.log(`Current enrolled: ${classData.enrolled}`);

    //       // Update the seats and enrolled fields
    //       const updateDoc = {
    //         $inc: {
    //           enrolled: 1,
    //           seats: -1
    //         }
    //       };

    //       const updateResult = await classesCollection.updateOne(classQuery, updateDoc);
    //       updateResults.push(updateResult);

    //       // Log the result of the update operation
    //       console.log(`Update result for class ${classId}: ${updateResult.matchedCount} document(s) matched, ${updateResult.modifiedCount} document(s) modified`);

    //       if (updateResult.modifiedCount === 0) {
    //         return res.status(500).send({ message: `Failed to update class enrollment and seats for class: ${classId}` });
    //       }
    //     }

    //     res.send({ insertResult, deleteResult, updateResults });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error', error: error.message });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const selectedClassIds = payment.selectedClassId.map(id => {
    //       if (ObjectId.isValid(id)) {
    //         return new ObjectId(id)
    // ;
    //       } else {
    //         throw new Error(`Invalid ObjectId: ${id}`);
    //       }
    //     });

    //     const query = { _id: { $in: selectedClassIds } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Ensure the singleClassId is a valid ObjectId and is not a list
    //     const singleClassId = payment.singleClassId;
    //     if (Array.isArray(singleClassId)) {
    //       throw new Error(`Invalid ObjectId: singleClassId should not be an array: ${singleClassId}`);
    //     }

    //     if (!ObjectId.isValid(singleClassId)) {
    //       throw new Error(`Invalid ObjectId: ${singleClassId}`);
    //     }

    //     // Find the class to update its seats and enrolled number
    //     const classQuery = { _id: new ObjectId(singleClassId) };
    //     const classData = await classesCollection.findOne(classQuery);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     // Log the current values of seats and enrolled
    //     console.log(`Class ID: ${singleClassId}`);
    //     console.log(`Current seats: ${classData.seats}`);
    //     console.log(`Current enrolled: ${classData.enrolled}`);

    //     // Update the seats and enrolled fields
    //     const updateDoc = {
    //       $inc: {
    //         enrolled: 1,
    //         seats: -1
    //       }
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     // Log the result of the update operation
    //     console.log(`Update result: ${updatedEnrolledAndSeats.matchedCount} document(s) matched, ${updatedEnrolledAndSeats.modifiedCount} document(s) modified`);

    //     if (updatedEnrolledAndSeats.modifiedCount === 0) {
    //       return res.status(500).send({ message: "Failed to update class enrollment and seats" });
    //     }

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error', error: error.message });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const selectedClassIds = payment.selectedClassId.map(id => {
    //       if (ObjectId.isValid(id)) {
    //         return new ObjectId(id)
    // ;
    //       } else {
    //         throw new Error(`Invalid ObjectId: ${id}`);
    //       }
    //     });

    //     const query = { _id: { $in: selectedClassIds } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Ensure the singleClassId is a valid ObjectId
    //     const singleClassId = payment.singleClassId;
    //     if (!ObjectId.isValid(singleClassId)) {
    //       throw new Error(`Invalid ObjectId: ${singleClassId}`);
    //     }

    //     // Find the class to update its seats and enrolled number
    //     const classQuery = { _id: new ObjectId(singleClassId) };
    //     const classData = await classesCollection.findOne(classQuery);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     // Log the current values of seats and enrolled
    //     console.log(`Class ID: ${singleClassId}`);
    //     console.log(`Current seats: ${classData.seats}`);
    //     console.log(`Current enrolled: ${classData.enrolled}`);

    //     // Update the seats and enrolled fields
    //     const updateDoc = {
    //       $inc: {
    //         enrolled: 1,
    //         seats: -1
    //       }
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     // Log the result of the update operation
    //     console.log(`Update result: ${updatedEnrolledAndSeats.matchedCount} document(s) matched, ${updatedEnrolledAndSeats.modifiedCount} document(s) modified`);

    //     if (updatedEnrolledAndSeats.modifiedCount === 0) {
    //       return res.status(500).send({ message: "Failed to update class enrollment and seats" });
    //     }

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error', error: error.message });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const query = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Find the class to update its seats and enrolled number
    //     const classQuery = { _id: new ObjectId(payment.singleClassId) };
    //     const classData = await classesCollection.findOne(classQuery);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     // Log the current values of seats and enrolled
    //     console.log(`Class ID: ${payment.singleClassId}`);
    //     console.log(`Current seats: ${classData.seats}`);
    //     console.log(`Current enrolled: ${classData.enrolled}`);

    //     // Update the seats and enrolled fields
    //     const updateDoc = {
    //       $inc: {
    //         enrolled: 1,
    //         seats: -1
    //       }
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     // Log the result of the update operation
    //     console.log(`Update result: ${updatedEnrolledAndSeats.matchedCount} document(s) matched, ${updatedEnrolledAndSeats.modifiedCount} document(s) modified`);

    //     if (updatedEnrolledAndSeats.modifiedCount === 0) {
    //       return res.status(500).send({ message: "Failed to update class enrollment and seats" });
    //     }

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error' });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const query = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Find the class to update its seats and enrolled number
    //     const classQuery = { _id: new ObjectId(payment.singleClassId) };
    //     const classData = await classesCollection.findOne(classQuery);
    //     console.log(classData);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     // Update the seats and enrolled fields
    //     const updateDoc = {
    //       $inc: {
    //         enrolled: enrolled + 1,
    //         seats: enrolled -1
    //       }
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error' });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const query = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Find the class to update its seats and enrolled number
    //     const classQuery = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } };
    //     const classData = await classesCollection.findOne(classQuery);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     // Update the seats and enrolled fields
    //     const updateDoc = {
    //       $inc: {
    //         enrolled: 1,
    //         seats: -1
    //       }
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error' });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const query = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Find the class to update its seats and enrolled number
    //     const classQuery = { _id: new ObjectId(payment.singleClassId) };
    //     const classData = await classesCollection.findOne(classQuery);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     const seats = classData.seats;
    //     const enrolled = classData.enrolled;

    //     const updateDoc = {
    //       $set: {
    //         enrolled: enrolled + 1,
    //         seats: seats - 1
    //       },
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error' });
    //   }
    // });

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   const payment = req.body;
    //   const insertResult = await paymentCollection.insertOne(payment)

    //   const query = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } }
    //   const deleteResult = await selectedClassesCollection.deleteMany(query)

    //   const classQuery = { _id: { $eq: payment.singleClassId.map(id => new ObjectId(id)) } }
    //   const classData = await classesCollection.find(classQuery)

    //   const seats = classData.seats
    //   const enrolled = classData.enrolled

    //   console.log('result', seats, enrolled);


    //   // const id = req.params.id;
    //   // const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //   $set: {
    //     enrolled: enrolled + 1,
    //     seats: seats - 1
    //   },
    // };

    // const updatedEnrolledAndSeats = await classesCollection.updateMany(classQuery, updateDoc)


    //   res.send({ insertResult, deleteResult, updatedEnrolledAndSeats })
    // })
// --------

    // app.post('/payments', verifyJWT, async (req, res) => {
    //   try {
    //     const payment = req.body;
    //     const insertResult = await paymentCollection.insertOne(payment);

    //     // Delete selected class items
    //     const query = { _id: { $in: payment.selectedClassId.map(id => new ObjectId(id)) } };
    //     const deleteResult = await selectedClassesCollection.deleteMany(query);

    //     // Update enrolled number and seats
    //     const classQuery = { _id: new ObjectId(payment.singleClassId) };
    //     const classData = await classesCollection.findOne(classQuery);

    //     if (!classData) {
    //       return res.status(404).send({ message: "Class not found" });
    //     }

    //     const seats = classData.seats;
    //     const enrolled = classData.enrolled;

    //     const updateDoc = {
    //       $set: {
    //         enrolled: enrolled + 1,
    //         seats: seats - 1
    //       },
    //     };

    //     const updatedEnrolledAndSeats = await classesCollection.updateOne(classQuery, updateDoc);

    //     res.send({ insertResult, deleteResult, updatedEnrolledAndSeats });
    //   } catch (error) {
    //     console.error('Error processing payment:', error);
    //     res.status(500).send({ message: 'Internal Server Error' });
    //   }
    // });











// app.post('/payments', async (req, res) => {
//   const payment = req.body;
//   const insertedResult = await paymentCollection.insertOne(payment);

//   const classId = payment.classesId;
//   const classQuery = { _id: { $eq: new ObjectId(classId) } };
//   const classData = await classCollection.findOne(classQuery);
//   const availableSeats = parseInt(classData?.availableSeats);
//   const enrolled = parseInt(classData?.enrolled);
//   console.log('231',availableSeats,enrolled)
//   const classUpdate = {
//       $set: { availableSeats: availableSeats - 1, enrolled: enrolled + 1 },
//   };
//   const classUpdateResult = await classCollection.updateOne(classQuery, classUpdate);

//   const query = { _id: { $in: [new ObjectId(payment.ClasId)] } };
//   const deleteResult = await selectedClassCollection.deleteOne(query);

//   res.send(deleteResult,insertedResult,classUpdateResult);
// })
