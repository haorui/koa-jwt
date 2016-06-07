var koa = require('koa');
var koajwt = require('./index');

var profile = {
	id: 123
};

//var token = koajwt.sign(profile, 'secret', {expiresInMinutes: 60*5});
var token = koajwt.sign(profile, 'secret', { expiresIn: 60*5 });

console.log('Starting koa-jwt test server on http://localhost:3000/');
console.log('');
console.log('You can test the sever by issuing curl commands like the following:');
console.log('');
console.log(' curl http://localhost:3000/public/foo # should succes return unprotected');
console.log(' curl http://localhost:3000/api/foo # should fail return 401 unauthorized ...');
console.log(' curl -H authorization: bearer ' + token + ' http://localhost:3000/api/foo # should sucdess ');
console.log('');

var app = koa();

app.use(function* (next){
	try{
		yield next;
	}catch(e){
		if(401 === e.status){
			this.status = 401;
			this.body = '401 unauthorized - protected resource, use authorization header to get access\n';
		}else{
			throw e;
		}
	}
});

app.use(function* (next){
	if (this.url.match(/^\/public/)){
		this.body = 'unprotected\n';
	}else{
		yield next;
	}
});

app.use(koajwt({secret: 'secret'}));

app.use( function* (next){
	if (this.url.match(/^\/api/)){
		this.body = 'protected\n';
	}
});

app.listen(3000);