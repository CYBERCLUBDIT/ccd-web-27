import { Pool } from 'pg';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes,createHash } from 'node:crypto';
process.loadEnvFile('.env.local');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
await pool.query(readFileSync('scripts/schema.sql','utf8'));
const email='ezekielezekiel003@gmail.com';
const {rows}=await pool.query("INSERT INTO users(name,email,role,status) VALUES($1,$2,'admin','approved') ON CONFLICT(email) DO UPDATE SET role='admin' RETURNING id,password_hash",['Administrator',email]);
if(!rows[0].password_hash){
 const token=randomBytes(32).toString('hex');
 await pool.query("DELETE FROM password_tokens WHERE user_id=$1",[rows[0].id]);
 await pool.query("INSERT INTO password_tokens VALUES($1,$2,now()+interval '24 hours')",[createHash('sha256').update(token).digest('hex'),rows[0].id]);
 mkdirSync('.local',{recursive:true});
 writeFileSync('.local/admin-setup.txt',`Administrator: ${email}\nOpen this private one-time link to set your password:\nhttp://127.0.0.1:3000/reset-password?token=${token}\nExpires after 24 hours. Keep this file private; delete after setup.\n`);
}
console.log('Schema ready. Administrator password setup saved to .local/admin-setup.txt. No sample records inserted.');
await pool.end();
