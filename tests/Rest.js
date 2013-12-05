define([
	'require',
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dojo/request/registry',
	'dstore/Rest',
	'./mockRequest'
], function(require, registerSuite, assert, declare, lang, request, Rest, mockRequest){
	// NOTE: Because HTTP headers are case-insensitive they should always be provided as all-lowercase
	// strings to simplify testing.
	function runTest(method, args){
		var d = this.async();
		store[method].apply(store, args).then(d.callback(function(result){
			var k;
			var resultHeaders = result.headers;
			for(k in requestHeaders){
				assert.strictEqual(resultHeaders[k], requestHeaders[k]);
			}

			for(k in globalHeaders){
				assert.strictEqual(resultHeaders[k], globalHeaders[k]);
			}
		}), lang.hitch(d, 'reject'));
	}

	var globalHeaders = {

		'test-global-header-a': 'true',
		'test-global-header-b': 'yes'
	};
	var requestHeaders = {
		'test-local-header-a': 'true',
		'test-local-header-b': 'yes',
		'test-override': 'overridden'
	};
	var store = new Rest({
		target: require.toUrl('dstore/tests/x.y').match(/(.+)x\.y$/)[1],
		headers: lang.mixin({ 'test-override': false }, globalHeaders)
	});
	store.model.prototype.describe = function(){
		return 'name is ' + this.name;
	};

	var registerHandle;

	registerSuite({
		name: 'dstore Rest',

		before: function(){
			registerHandle = request.register(/.*mockRequest.*/, mockRequest);
		},

		after: function(){
			registerHandle.remove();
		},

		'get': function(){
			var d = this.async();
			store.get('data/node1.1').then(d.callback(function(object){
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
			}));
		},

		'query': function(){
			var d = this.async();
			return store.filter("data/treeTestRoot").forEach(function(object){
				if(first){
					first = false;
					assert.strictEqual(object.name, 'node1');
					assert.strictEqual(object.describe(), 'name is node1');
					assert.strictEqual(object.someProperty, 'somePropertyA');
				}
			});
		},

		'query iterative': function(){
			var d = this.async();
			var i = 0;
			return store.filter('data/treeTestRoot').forEach(d.rejectOnError(function(object){
				i++;
				assert.strictEqual(object.name, 'node' + i);
				// the intrinsic methods
				assert.equal(typeof object.save, 'function');
				assert.equal(typeof object.remove, 'function');
				// the method we added
				assert.equal(typeof object.describe, 'function');
			}));
		},

		'headers get 1': function(){
			runTest.call(this, 'get', [ 'mockRequest/1', requestHeaders ]);
		},

		'headers get 2': function(){
			runTest.call(this, 'get', [ 'mockRequest/2', { headers: requestHeaders } ]);
		},

		'headers remove': function(){
			runTest.call(this, 'remove', [ 'mockRequest/3', { headers: requestHeaders } ]);
		},

		'headers put': function(){
			runTest.call(this, 'put', [
				{},
				{
					id: 'mockRequest/4',
					headers: requestHeaders }
			]);
		},

		'headers add': function(){
			runTest.call(this, 'add', [
				{},
				{
					id: 'mockRequest/5',
					headers: requestHeaders
				}
			]);
		},

		'get and save': function(){
			return store.get('index.php').then(function(object){
				object.save().then(function(result){
					// just make sure we got something for a response
					assert.isTrue(!!result);
				});
			});
		}
	});
});
