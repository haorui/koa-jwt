var TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE0MjY1NDY5MTl9.ETgkTn8BaxIX4YqvUWVFPmum3moNZ7oARZtSBXb_vP4';

var koa = require('koa');
var request = require('supertest');
var assert = require('assert');

var koajwt = require('./index');

describe('失败测试', function(){

	it('should throw 401 if no authorization header', function(done){

		var app = koa();

		app.use(koajwt({secret:'shhhh'}));
		request(app.listen())
		.get('/')
		.expect(401)
		.end(done);
	});

	it('should return 401 if authorization header is malformed', function(done){

		var app = koa();
		app.use(koajwt({secret:'shhhh'}));
		request(app.listen())
		.get('/')
		.set('Authorization', 'wrong')
		.expect(401)
		.expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n')
		.end(done);
	});

	it('should allow provided getToken function to throw', function(done){

		var app = koa();

		app.use(koajwt({secret: 'shhhh', getToken: function(){
			this.throw(401, 'bad authorization\n');
		}}));

		request(app.listen())
		.get('/')
		.expect(401)
		.expect('bad authorization\n')
		.end(done);
	});

	it('should throw if getToken function returns invalid jwt', function(done){
		var app = koa();
		app.use(koajwt({secret: 'shhhhhh', getToken: function(){
			var secret = 'bad';
			return koajwt.sign({foo: 'bar'}, secret);
		}}));
		request(app.listen())
		.get('/')
		.expect(401)
		.expect('Invalid token\n')
		.end(done);
	});

	it('should throw if authorization header is not well-formatted jwt', function(done){
		var app = koa();
		app.use(koajwt({secret: 'shhhh'}));
		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer wrongjwt')
		.expect(401)
		.expect('Invalid token\n')
		.end(done);
	});

	it('should throw if authorization header is not valid jwt', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar'}, secret);
		var app = koa();
		app.use(koajwt({secret: 'different-shhhh', debug: true}));
		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(401)
		.expect('Invalid token - invalid signature\n')
		.end(done);
	});

	it('should throw if opts.cookies is set and the specified cookies is not well-formatted jwt.', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo: 'bar'}, secret);

		var app = koa();
		app.use(koajwt({secret: secret, cookie: 'jwt'}));
		app.use(function*(next){
			this.body = this.state.user;
		});

		request(app.listen())
		.get('/')
		.set('Cookie', 'jwt=bad'+token+';')
		.expect(401)
		.expect('Invalid token\n')
		.end(done);
	});

	it('should throw if audience is not expected.', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo: 'bar', aud: 'expected-audience'}, secret);
		var app = koa();

		app.use(koajwt({secret: 'shhhhhh', audience:'not-expected-audience', debug:true}));

		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(401)
		.expect('Invalid token - jwt audience invalid. expected: not-expected-audience\n')
		.end(done);
	});

	it('should throw if token is expired.', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar', exp: 1382412921}, secret);

		var app = koa();

		app.use(koajwt({secret: 'shhhhhh', debug: true}));

		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(401)
		.expect('Invalid token - jwt expired\n')
		.end(done);
	});

	it('should throw if token issuer is wrong.', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar', iss:'http://foo'}, secret);

		var app = koa();

		app.use(koajwt({secret: 'shhhhhh', issuer: 'http://wrong', debug: true}));
		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(401)
		.expect('Invalid token - jwt issuer invalid. expected: http://wrong\n')
		.end(done);
	});

	it('should throw if secret neigher provided by options and middleware.', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar', iss:'http://foo'}, secret);

		var app = koa();
		app.use(koajwt({debug: true}));
		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(500)
		.expect('Internal Server Error')
		.end(done);
	});

	it('should throw if secret both provide by options(right secret) and middleware(wrong secret).', function(done){
		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar', iss:'http://foo'}, secret);

		var app = koa();

		app.use(koajwt({secret: 'wrong secret', debug: true}));
		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(401)
		.expect('Invalid token - invalid signature\n')
		.end(done);
	});
});

describe('通过测试', function(){

	it('should continue if `passthrough` is true', function(done){
		var app = koa();
		app.use(koajwt({secret: 'shhhhhh', passthrough: true, debug: true}));
		app.use(function* (next){
			this.body = this.state.user;
		});

		request(app.listen())
		.get('/')
		.expect(204)
		.expect('')
		.end(done);
	});
});

describe('成功测试', function(){

	it('should work if authorization header is valid jwt.', function(done){
		var validUserResponse = function(res){
			if (!(res.body.foo === 'bar')){
				return 'Wrong user';
			}
		}

		var secret = 'shhhhhh';
		var token = koajwt.sign({foo: 'bar'}, secret);

		var app = koa();

		app.use(koajwt({secret: secret}));

		app.use(function*(next){
			this.body = this.state.user;
		});

		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

	it('should work if the provided getToken function returns a valid jwt.', function(done){
		var validUserResponse = function(res){
			if(!(res.body.foo === 'bar')){
				return 'Wrong user';
			}
		}
			var secret = 'shhhhhh';
			var token = koajwt.sign({foo:"bar"}, secret);

			var app = koa();
			app.use(koajwt({ secret: secret, getToken: function(){
				return this.request.query.token;
			}}));
			app.use(function*(next){
				this.body = this.state.user;
			});
			request(app.listen())
			.get('/?token='+token)
			.expect(200)
			.expect(validUserResponse)
			.end(done);

	});

	it('should use the first resolved token.', function(done){
		var validUserResponse = function(res){
			if (!(res.body.foo === 'bar')){
				return 'Wrong user';
			}
		}

		var secret = 'shhhhhh';
		var token =  koajwt.sign({foo: 'bar'}, secret);

		var invalidToken = koajwt.sign({foo: 'bar'}, 'badSecret');

		var app = koa();
		app.use(koajwt({secret: secret, cookie: 'jwt'}));
		app.use(function*(next){
			this.body = this.state.user;
		});
		request(app.listen())
		.get('/')
		.set('Cookie', 'jwt='+token+';')
		.set('Authorization', 'Bearer ' + invalidToken)
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

	it('should work if opts.cooikes is set and the specified cookie contains valid jwt.', function(done){
		var validUserResponse = function(res){
			if (!(res.body.foo === 'bar')) {return 'Wrong user'}
		}

		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar'}, secret);

		var app = koa();
		app.use(koajwt({secret: secret, cookie:'jwt'}));
		app.use(function*(next){
			this.body = this.state.user;
		});

		request(app.listen())
		.get('/')
		.set('Cookie', 'jwt='+token+';')
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

	it('should use provided key for decoded data', function(done){
		var validUserResponse = function(res){
			if(!(res.body.foo === 'bar')){ return 'Key param not used properly';}
		}

		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar'}, secret);

		var app = koa();
		app.use(koajwt({secret: secret, key: 'jwtdata'}));
		app.use(function*(next){
			this.body = this.state.jwtdata;
		});

		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

	it('should work if secret is provided by middleawre', function(done){
		var validUserResponse = function(res){
			if (!(res.body.foo === 'bar')){
				return 'Wrong user';
			}
		}

		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar'}, secret);

		var app = koa();
		app.use(function*(next){
			this.state.secret = secret;
			yield next;
		});

		app.use(koajwt());
		app.use(function*(next){
			this.body = this.state.user;
		});

		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

	it('should use middleware secret if both middleawre and options provided', function(done){
		var validUserResponse = function(res){
			if (!(res.body.foo === 'bar')){
				return 'Wrong user';
			}
		}

		var secret = 'shhhhhh';
		var token = koajwt.sign({foo:'bar'}, secret);

		var app = koa();

		app.use(function*(next){
			this.state.secret = secret;
			yield next;
		});
		app.use(koajwt({secret: 'wrong secret'}));
		app.use(function*(next){
			this.body = this.state.user;
		});
		request(app.listen())
		.get('/')
		.set('Authorization', 'Bearer ' + token)
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

});

describe('排除测试', function(){

	it('should pass if the route is excluded.', function(done){
		var validUserResponse = function(res){
			if (!(res.body.success === true)){
				return 'koa-jwt is getting fired.'
			}
		}

		var secret = 'shhhhhh';
		var token =  koajwt.sign({foo: 'bar'}, secret);

		var app = koa();
		app.use(koajwt({secret: secret}).unless({path: ['/public']}));
		app.use(function* (next){
			this.body = {success: true};
		});

		request(app.listen())
		.get('/public')
		.set('Authorization', 'wrong')
		.expect(200)
		.expect(validUserResponse)
		.end(done);
	});

it('should fail if the route is not excluded', function(done) {
    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret }).unless({ path: ['/public']}));
    app.use(function* (next) {
      this.body = { success: true };
    });

    request(app.listen())
      .get('/private')
      .set('Authorization', 'wrong')
      .expect(401)
      .expect('Bad Authorization header format. Format is "Authorization: Bearer <token>"\n')
      .end(done);
  });

  it('should pass if the route is not excluded and the token is present', function(done) {
    var validUserResponse = function(res) {
      if (!(res.body.foo === 'bar')) return "Key param not used properly";
    };

    var secret = 'shhhhhh';
    var token = koajwt.sign({foo: 'bar'}, secret);

    var app = koa();

    app.use(koajwt({ secret: secret, key: 'jwtdata' }).unless({ path: ['/public']}));
    app.use(function* (next) {
      this.body = this.state.jwtdata;
    });

    request(app.listen())
      .get('/')
      .set('Authorization', 'Bearer ' + token)
      .expect(200)
      .expect(validUserResponse)
      .end(done);

  });

});

