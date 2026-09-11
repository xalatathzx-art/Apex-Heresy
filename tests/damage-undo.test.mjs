import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

test('undo refuses to overwrite critical damage from a later attack',async()=>{
    const system=loadSystem();let writes=0;
    const actor={wounds:{value:10,critical:7},horde:0,update:async()=>writes++,getActiveTokens:()=>[]};
    const entry={sceneId:'scene',tokenId:'token',woundsBefore:10,woundsAfter:10,woundsDelta:0,
        criticalBefore:0,criticalAfter:3,criticalDelta:3};
    const message={getFlag:()=>entry,setFlag:async()=>{},getRollData:()=>null,delete:async()=>{}};
    system.context.game.user={isGM:true};system.context.game.messages=new Map([['msg',message]]);
    system.context.game.i18n={localize:v=>v};
    system.context.$=()=>({closest:()=>({data:()=> 'msg'})});
    system.context.canvas={ready:true,scene:{id:'scene'},tokens:new Map([['token',{actor}]])};
    system.context.game.scenes.set('scene',{tokens:new Map([['token',{actor}]])});
    system.context.ui={notifications:{warn(){}}};
    system.context.foundry.applications={api:{DialogV2:{confirm:async()=>true}}};
    await system.get('onManualDamageUndoClick')({preventDefault(){}});
    assert.equal(writes,0);
    assert.equal(entry.reverted,undefined);
});
