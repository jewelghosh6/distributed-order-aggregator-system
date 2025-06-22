import { Pool } from "pg";
import { localDb, vendorADb, vendorBDb } from "../db/client"

export const getDBInstance=(vendorName:string)=>{
    if(vendorName=="vendorA"){
        return vendorADb;
    }
    else if(vendorName=="vendorB"){
        return vendorBDb;
    }
    else if(vendorName ==="local"){
        return localDb;
    }
    else return null;
}