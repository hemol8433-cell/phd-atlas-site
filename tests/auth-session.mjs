import assert from "node:assert/strict";
import fs from "node:fs/promises";

const source = await fs.readFile(new URL("../docs/auth-core.js", import.meta.url), "utf8");
const file = await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));
const user = { id:"test-auth-user" };
const base = { configured: true };
let calls = [];

const loggedOut = {
  ...base,
  client: {
    auth: {
      async getSession() {calls.push("getSession");return {data:{session:null},error:null}},
      async getUser() {throw Error("Logged-out visitor must not call getUser()")}
    },
    from() {throw Error("Logged-out visitor must not query private tables")}
  }
};
assert.equal(await file.getAuthorizedUser(loggedOut), null);
assert.deepEqual(calls,["getSession"]);

const approved = {
  ...base,
  client: {
    auth: {
      async getSession() {return {data:{session:{access_token:"test"}},error:null}},
      async getUser() {return {data:{user},error:null}}
    },
    from(table) {
      assert.equal(table,"phd_private_papers");
      return { select(col) {
        assert.equal(col,"id");
        return {eq(col2,id){assert.equal(col2,"id"); assert.equal(id,1);return {async maybeSingle(){return {data:{id:1},error:null}}}}};
      }};
    }
  }
};
assert.equal(await file.getAuthorizedUser(approved),user);

const denied={
  ...approved,
  client:{...approved.client,from(){
    return {select(){return {eq(){return {async maybeSingle(){return {data:null,error:null}}}}}}};
  }}
};
assert.equal(await file.getAuthorizedUser(denied),null);

const gone={
  ...base,
  client:{...approved.client,auth:{...approved.client.auth,async getUser(){
    return {data:{user:null},error:{name:"AuthSessionMissingError",message:"Auth session missing!"}};
  }}}
};
assert.equal(await file.getAuthorizedUser(gone),null);
console.log("PASS: logged out, authorized owner, unauthorized identity, expired session");
