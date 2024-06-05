const express = require('express')
const app = express()
const cors = require('cors');
const port = process.env.PORT || 4000;
const jwt = require('jsonwebtoken')



require('dotenv').config()
app.use(cors({
    origin: [
        'http://localhost:5173',

    ],
    credentials: true
}));
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zqymdgy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const userCollection = client.db("workout").collection("users")
        const trainersCollection = client.db("workout").collection("trainers")
        const classesCollection = client.db("workout").collection("classes")
        const bookingCollection = client.db("workout").collection("booking")
        app.get('/', (req, res) => {
            res.send('Hello World!')
        })


        // jwt related api------------------------------------------------
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // classes related api ------------------------------------------
        app.get('/classes', async (req, res) => {

            const page = parseInt(req.query.page) || 1;
            const pageSize = 6;


            const skip = (page - 1) * pageSize;

            const result = await classesCollection.aggregate([
                {
                    $lookup: {
                        from: "trainers",
                        let: { className: "$name" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $in: ["$$className", "$specialties"]
                                    }
                                }
                            },
                            {
                                $project: {
                                    id: "$_id",
                                    name: "$name",
                                    image: "$images"
                                }
                            }
                        ],
                        as: "trainers"
                    }
                },
                {
                    $project: {
                        name: 1,
                        title: 1,
                        description: 1,
                        image: 1,
                        bookings: 1,
                        trainers: 1
                    }
                },
                {
                    $sort: { bookings: -1 } // Sort by bookings in descending order
                },
                { $skip: skip },
                { $limit: pageSize }
            ]).toArray();

            res.send(result);

        });
        app.get('/classes/count', async (req, res) => {
            const result = await classesCollection.countDocuments()
            res.send({ result })
        })




        // user related post api------------------------------------ 
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user)
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });


        // trainer related api ----------------------------------------
        app.get('/trainers', async (req, res) => {
            const result = await trainersCollection.find().toArray()
            res.send(result)
        })
        app.get('/trainers/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await trainersCollection.findOne(query)
            res.send(result)
        })



        // bookings related api _____---------------------------------------------

        app.post("/booking", async (req, res) => {
            const data = req.body
            const result = await bookingCollection.insertOne(data)
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


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})