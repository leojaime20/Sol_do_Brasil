import { readFile } from 'node:fs/promises';
import { googleApi, projectId } from './google-api.mjs';

const source = {files:[{name:'firestore.rules',content:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')} ]};
const identity = {uid:'rules-test-only',token:{email:'convidado@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}};
const mocks = enabled => [
  {function:'exists',args:[{anyValue:{}}],result:{value:true}},
  {function:'get',args:[{anyValue:{}}],result:{value:{data:{enabled}}}},
];
const cases = [
  {label:'Visitante não lê músicas',expectation:'DENY',method:'get',path:'songs/1',auth:null},
  {label:'Google autorizado lê músicas',expectation:'ALLOW',method:'get',path:'songs/1',auth:identity,enabled:true},
  {label:'Google sem convite não lê músicas',expectation:'DENY',method:'get',path:'songs/1',auth:identity,enabled:false},
  {label:'Conta não verificada é bloqueada',expectation:'DENY',method:'get',path:'songs/1',auth:{...identity,token:{...identity.token,email_verified:false}},enabled:true},
  {label:'Login por senha é bloqueado',expectation:'DENY',method:'get',path:'songs/1',auth:{...identity,token:{...identity.token,firebase:{sign_in_provider:'password'}}},enabled:true},
  {label:'Membro não pode editar catálogo',expectation:'DENY',method:'update',path:'songs/1',auth:identity,enabled:true},
  {label:'Usuário pode conferir seu convite',expectation:'ALLOW',method:'get',path:'allowedUsers/convidado@example.com',auth:identity},
  {label:'Usuário não pode ler convite alheio',expectation:'DENY',method:'get',path:'allowedUsers/outra@example.com',auth:identity},
  {label:'Usuário não pode se autorizar',expectation:'DENY',method:'create',path:'allowedUsers/convidado@example.com',auth:identity},
  {label:'Lista de convidados é privada',expectation:'DENY',method:'list',path:'allowedUsers',auth:identity,enabled:true},
];
const testCases=cases.map(({label,method,path,auth,enabled,expectation})=>({
  expectation,request:{method,path:`/databases/(default)/documents/${path}`,auth},
  resource:{data:{enabled:true}},functionMocks:mocks(enabled ?? false),
}));
const result=await googleApi(`https://firebaserules.googleapis.com/v1/projects/${projectId}:test`,{method:'POST',body:JSON.stringify({source,testSuite:{testCases}})});
if(result.issues?.some(issue=>issue.severity==='ERROR')) throw new Error(JSON.stringify(result.issues));
let failed=false;
for(const [i,test] of (result.testResults||[]).entries()) {
  const passed=test.state==='SUCCESS';
  console.log(`${passed?'PASS':'FAIL'} ${cases[i].label}`);
  if(!passed){failed=true;console.log(JSON.stringify(test));}
}
if(failed || result.testResults?.length!==cases.length) process.exit(1);
