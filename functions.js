const bcrypt = require('bcryptjs');

// دیتابیس موقت
let users = [
  {
    id: '1',
    username: 'مدیر سعدی',
    userid: 'admin',
    password: '$2a$10$8K1p/a0dRT1ppK6/6OOKeeOV9kDSN5w7/INDcHfzCjUXRkS8SqQaK', // password: 123456
    online: true,
    verified: true
  }
];

exports.handler = async (event) => {
  const { action, username, userid, password } = JSON.parse(event.body);

  try {
    if (action === 'register') {
      // ثبت‌نام کاربر
      const existingUser = users.find(u => u.userid === userid);
      if (existingUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            success: false,
            error: 'این ایدی کاربری قبلاً ثبت شده است' 
          })
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: Date.now().toString(),
        username,
        userid,
        password: hashedPassword,
        online: true,
        verified: false
      };
      
      users.push(newUser);
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'حساب کاربری با موفقیت ایجاد شد',
          user: { 
            id: newUser.id, 
            username: newUser.username, 
            userid: newUser.userid, 
            online: newUser.online,
            verified: newUser.verified
          }
        })
      };
    }

    if (action === 'login') {
      // ورود کاربر
      const user = users.find(u => u.username === username || u.userid === username);
      if (!user) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            success: false,
            error: 'کاربری با این مشخصات وجود ندارد' 
          })
        };
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            success: false,
            error: 'رمز عبور اشتباه است' 
          })
        };
      }

      user.online = true;
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'ورود موفقیت‌آمیز بود',
          user: { 
            id: user.id, 
            username: user.username, 
            userid: user.userid, 
            online: user.online,
            verified: user.verified
          }
        })
      };
    }

    if (action === 'get_users') {
      // دریافت لیست کاربران
      const usersList = users.map(user => ({
        id: user.id,
        username: user.username,
        userid: user.userid,
        online: user.online,
        verified: user.verified
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          users: usersList
        })
      };
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'خطا در سرور' 
      })
    };
  }
};