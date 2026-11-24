import {teamAccountHandler} from './handler.ts';
Deno.serve(teamAccountHandler(key=>Deno.env.get(key)));
