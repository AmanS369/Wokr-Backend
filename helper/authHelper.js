import bcrypt from "bcrypt";
export const hash = async(password)=>{
    try{
        const hashpasword =  await bcrypt.hash(password,10);
        return hashpasword;
    }catch(e){
        console.log(e);
    }
}

export const compare = async(password,hashpassword)=>{
    try{
        return bcrypt.compare(password,hashpassword);
    
    }catch(e){
        console.log(e);
    }
}