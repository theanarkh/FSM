var utils = {
	getType: function(content) {
		return Object.prototype.toString.call(content).match(/\[object (.*)\]/)[1];
	},
	isType: function(content, type) {
		return this.getType(content).toLowerCase() === type.toLowerCase();
	}

};
function FSMTable(arg) {
	if (this instanceof FSMTable) {
		this.table = [];
		if (utils.isType(arg, 'Array')) {
			for(var i = 0 ;i < arg.length; i++) {
				this.table.push(new FSMItem(arg[i]));
			}
		}
		return this;
	}
	return new FSMTable(arg);
}

FSMTable.prototype = {
	append: function(arg) {
		this.table.push(arg);
	},
	getLenght: function() {
		return this.table.length;
	},
	getItem: function(index) {
		if (index >= this.getLenght()) {
			return null;
		}
		return this.table[index];
	},
	setItem: function(state, arg) {
		var len = this.getLenght();
		for (var i = 0; i < len; i++) {
			if (this.table[i]['state'] === state) {
				for (var k in arg) {
					if (arg.hasOwnProperty(k) && k !== 'state') {
						this.table[i][k] = arg[k];
					}
				}
				break;
			}
		}
	},
	delItem: function(state) {
		var len = this.getLenght();
		for (var i = 0; i < len; i++) {
			if (this.table[i]['state'] === state) {
				delete this.table[i];
				break;
			}
		}
	}
}
function FSMItem(arg) {
	this.state = arg.state;
	this.eventHandlers = arg.eventHandlers;
}




function Iteraor(content, cfg) {
	this.content = content;
	this.length = 0;
	this.count = 0;
	this.position = 0;
	this.direction = (cfg && cfg.direction) || 0;
	this.init();
}
Iteraor.prototype = {
	next: function() {
		if (!this.hasNext()) {
			return null;
		}
		this.count++;
		if (this.direction === 0) {
			return this.content[this.position++];
		} else {
			return this.content[this.position--];
		}
		
	},	
	rewind: function(index) {
		if (index  < this.length && index >= 0) {
			this.position = index;
			this.count = this.direction === 0 ? index : this.length - index - 1;
		}
	},
	hasNext: function() {
		return this.count < this.length;
	},
	init: function() {
		
		var type = utils.getType(this.content);
		switch(type) {
			case 'String': 
							this.content = this.content.split('');
							break;
			case 'Array': 
							this.content = this.content.concat();
							break;
			case 'Object': 
						var arr = [];
						var keys = Object.keys(this.content);
						for (var i = 0; i< keys.length; i++) {
							arr.push(this.content[keys[i]]);
						}
						this.content = arr;
						break;
		}
		
		this.length = this.content.length;
		this.position = this.direction === 0 ? 0 : this.length - 1;
	}
}

function FSM(table,initState,endState,content,cfg) {
	this.iterator = new Iteraor(content, cfg);
	this.table = table;
	this.currentState = initState;
	this.endState = endState;
	this.result = [];
	this.currentResult = '';
	this.hooks = (cfg && cfg.hooks) || null;
}
FSM.prototype = {
	getCurrentState: function() {
		return this.currentState;
	},
	setCurrentState: function(state) {
		return this.currentState = state;
	},
	getCurrentResult: function() {
		return this.currentResult;
	},
	setCurrentResult: function(val, mode) {
		mode = mode || 'a';
		switch(mode) {
			case 'a' : this.currentResult += val; break;
			case 'w' : this.currentResult = val; break;
		}
	},
	getResult: function() {
		return this.result;
	},
	setResult: function(val, mode) {
		mode = mode || 'a';
		switch(mode) {
			case 'a' : this.result.push(val); break;
			case 'w' : this.result = val; break;
		}
		
	},
	setHook: function(hookName, hookValue) {
		this.hooks[hookName] = hookValue;
	},
	stateHandler: function() {
		var content = this.getContent();
		var event = this.getEvent(content);
		var tableLength = this.table.getLenght();
		for (var index = 0; index < tableLength; index++) {
			var item = this.table.getItem(index);
			if (item.state === this.currentState && item.eventHandlers[event] && utils.isType(item.eventHandlers[event], 'function')) {
				if (item.eventHandlers[event].call(this,content) === false) {
					return false;
				} 
				break;
			}
		}
		return true;
	},
	getEvent: function(content) {
		return this.hooks.eventGetter.call(this,content);
	},
	getContent: function() {
		var content = null;
		if (this.iterator.hasNext()) {
			content = this.iterator.next();
		} 
		return content;
	},
	run: function() {
		var flag;
		do {
			flag = this.stateHandler();
		} while (!!flag);
	}
}


function charHandler(char) {
	this.setCurrentResult(char,'a');
	this.setCurrentState(STATE.INWORD);
}
	var STATE = {
		START:0,
		INWORD: 1,
		SPACE: 2,
		END:3
	}
	var EVENT = {
		GETACHAR: 1,
		GETASPACE:2,
		END: 3
	};
	var table = new FSMTable([{
		state:STATE.START,
		eventHandlers: {[EVENT.GETACHAR]: charHandler, [EVENT.GETASPACE]: function() {

		}}
	},{
		state:STATE.INWORD,
		eventHandlers: {[EVENT.GETACHAR]: charHandler, [EVENT.GETASPACE]: function(char) {
			this.setCurrentState(STATE.SPACE);
			this.setResult(this.getCurrentResult(),'a');
			this.setCurrentResult('','w');
		}}
	},{
		state:STATE.SPACE,
		eventHandlers: {[EVENT.GETACHAR]: charHandler, [EVENT.GETASPACE]: function(char) {
			
		}}
	},{
		state:STATE.END,
		eventHandlers: {[EVENT.END]: function() {
			if (this.getCurrentResult() !== '') {
				this.setResult(this.getCurrentResult(),'a');//.split('').reverse().join('')
			}
			
			return false;
		}}
	}]);
	var hooks = {
		eventGetter:function(content) {
			var event = null;
			if (content === null) {
				event = EVENT.END;
				this.setCurrentState(this.endState);
			}else if(/^\s$/.test(content)) {
				event = EVENT.GETASPACE;
			}else {
				event = EVENT.GETACHAR;
			}
				return event;
		}
	};

	data = 'sas s as a fc s f vf v fsv s';
	var fsm = new FSM(table,STATE.START,STATE.END,data, {direction: 0, hooks: hooks});
	fsm.run();
	console.log(fsm.result)
	/* nodejs 
	var fs = require('fs');
	var str = fs.readFile('fsm6.js',(err,data)=> {
		data = data.toString()
		var fsm = new FSM(table,STATE.START,STATE.END,data, {direction: 0, hooks: hooks});
		fsm.run();
		console.log(fsm.result)
	})
	*/
