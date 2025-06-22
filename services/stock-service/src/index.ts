import express, { Request, Response } from 'express';
import { localDb } from './db/client';
import { initDB } from './db/init';
import cron from 'node-cron';
import { runSyncJob } from './stockSync';
import { getDBInstance } from './helpers/getDBInstance';


const app = express();
app.use(express.json());

app.get('/:vendorName/stock/:id', async (req: express.Request, res: express.Response):Promise<void> => {
  const { id ,vendorName } = req.params;

  const DBinstance = getDBInstance(vendorName);

  if(!DBinstance){
    res.send({success:false,error: "Invalid vendor"});
    return;
  }

  const result = await DBinstance.query(`SELECT * FROM products WHERE id = $1`, [id]);

  if (result.rows.length === 0) res.status(404).send("Not found");
  res.json(result.rows[0]);
});


//For adding new stock in vendor db
app.patch('/stock/add-new/:vendorName',async(req:Request,res:Response)=>{
  try {
    const { vendorName } = req.params;

    const { productId, quantity } = req.body;

    const DBinstance = getDBInstance(vendorName);

    if(!DBinstance || !productId || !quantity){
      res.send({success:false,error: "Invalid vendor or product id or quantity"});
      return;
    }

    const addResult = await DBinstance.query(
      `UPDATE products
       SET stock = stock + $1
       WHERE id = $2
       RETURNING *;`,
      [quantity, productId]
    );

    res.send({data:addResult,success:true, message:"New stock added for vendor: "+vendorName})

  } catch (error) {
    res.send({error, success:false})
  }
})


app.patch('/stock/update/:vendorName', async (req: Request, res: Response) => {
  const { vendorName } = req.params;
  const { productId, quantity } = req.body;

  if(!vendorName || !productId || !quantity){
    res.send({success:false, msg: "Invalid parameters"})
    return;
  }

  console.log("Inside vendor Db Upadte API for vendor: "+ vendorName)

  const DBinstance = getDBInstance(vendorName);
  if (!DBinstance) {
    res.status(400).json({ success: false, error: 'Invalid vendor name' });
    return;
  }

  try {
    // Reduce stock only if available
    const updateResult = await DBinstance.query(
      `UPDATE products
       SET stock = stock - $1
       WHERE id = $2 AND stock >= $1
       RETURNING *;`,
      [quantity, productId]
    );

    if (updateResult.rowCount === 0) {
      console.log('Insufficient vendor stock or product not found');
      res.status(400).json({ success: false, error: 'Insufficient vendor stock or product not found' });
      return;
    }

    console.log("Upadted prpduct stock  in vemdor:"+vendorName)
    console.log("==================")
    console.log(updateResult.rows[0] )
    console.log("==================")

    res.json({ success: true, updatedProduct: updateResult.rows[0] });
  } catch (err: any) {
    console.error(`Error updating vendor stock:`, err.message);
   res.status(500).json({ success: false, error: 'Vendor stock update failed' });
  }
});


(async () => {
  await initDB();
  // Schedule the sync every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    console.log('Running sync job...');
    await runSyncJob();
  });
  app.listen(process.env.PORT, () => console.log(`Stock service on port ${process.env.PORT}`));
})();
