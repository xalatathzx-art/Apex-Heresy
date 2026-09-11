import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadSystem} from './helpers/system.mjs';

for (const [roll,dead] of [[90,false],[91,true],[100,true]]) test(`manual blood loss ${roll} uses same lethal result and synthetic actor`,async()=>{
    const system=loadSystem();let deaths=0,card;
    const actor={id:'base',uuid:'Scene.other.Token.npc.Actor.base',name:'NPC',isOwner:true,type:'heretic',addCondition:async()=>deaths++};
    system.context.game.actors.set('base',{addCondition:async()=>assert.fail('base actor changed')});
    system.context.game.scenes.set('other',{tokens:new Map([['npc',{actor}]])});
    system.context.Roll=class {async evaluate(){this.total=roll;return this;}};
    system.context.foundry.applications={handlebars:{renderTemplate:async(_path,data)=>{card=data;return '';}}};
    system.context.ChatMessage={getSpeaker:()=>({}),create:async()=>({})};
    const event={preventDefault(){},stopPropagation(){},currentTarget:{dataset:{actorId:'base',tokenId:'npc'}}};
    await system.get('onBloodLossRollClick')(event);
    assert.equal(deaths,dead?1:0);
    assert.equal(card.lethal,true);
    assert.equal(card.isDead,dead);
});
