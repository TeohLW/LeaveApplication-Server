const router = require('koa-router')()
const User = require('./../models/userSchema')
const Menu = require('./../models/menuSchema')
const Role = require('./../models/roleSchema')
const Counter = require('./../models/counterSchema')
const util = require('./../utils/util')
const jwt = require('jsonwebtoken')
const md5 = require('md5')

router.prefix('/users') 

router.post('/login', async (ctx) => {
  try {
    const { userName, userPwd } = ctx.request.body
    const res = await User.findOne({
      userName,
      userPwd: md5(userPwd)
    })
    
    if (res) {
      const data = res._doc 
      const token = jwt.sign({
        data,
      }, 'employee-leave-management-system', { expiresIn: '1d' })
      data.token = token
      ctx.body = util.success(data)
    } else {
      ctx.body = util.fail('incorrect')
    }
  } catch (error) {
    ctx.body = util.fail(error.msg)
  }

})

router.get('/list', async (ctx) => {
  const { userId, userName, state } = ctx.request.query;
  const { page, skipIndex } = util.pager(ctx.request.query)
  let params = {}
  if (userId) params.userId = userId;
  if (userName) params.userName = userName;
  if (state && state != '0') params.state = state;
  try {
    const query = User.find(params, { _id: 0, userPwd: 0 })
    const list = await query.skip(skipIndex).limit(page.pageSize)
    const total = await User.countDocuments(params);

    ctx.body = util.success({
      page: {
        ...page,
        total
      },
      list
    })
  } catch (error) {
    ctx.body = util.fail(`Error:${error.stack}`)
  }
})

router.get('/all/list', async (ctx) => {
  try {
    const list = await User.find({}, 'userId userName userEmail')
    ctx.body = util.success(list)
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

// Get user balance day
router.get('/balanceday', async (ctx) => {
  try {
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    const res = await User.findOne({_id: data._id})
    ctx.body = util.success(res)
    
  } catch (error) {
    ctx.body = util.fail(error.stack)
  }
})

router.post('/delete', async (ctx) => {
  const { userIds } = ctx.request.body
  const userIdList = userIds.map(user => user.userId);
  // User.updateMany({ $or: [{ userId: 10001 }, { userId: 10002 }] })
  const res = await User.updateMany({ userId: { $in: userIdList } }, { state: 2 })
  console.log(res.modifiedCount)
  if (res.modifiedCount != "0") {
    ctx.body = util.success(res, `Success updated ${res.modifiedCount} users`)
  }
  else{
    ctx.body = util.fail('Failed to delete');
  }
})

// Update Password
router.post('/updatepass', async (ctx) => {
  try {
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    const {pass} = ctx.request.body
    const res = await User.findByIdAndUpdate({_id: data._id}, {userPwd: md5(pass)})
    ctx.body = util.success("Success changed password!")
  }
  catch (error){
    ctx.body = util.fail('Failed to change password');
  }
})

router.post('/operate', async (ctx) => {
  const { userId, userName, userEmail, mobile, job, state, roleList, deptId, action } = ctx.request.body;
  if (action == 'add') {
    if (!userName || !userEmail || !deptId) {
      ctx.body = util.fail('Error', util.CODE.PARAM_ERROR)
      return;
    }
    const res = await User.findOne({ $or: [{ userName }, { userEmail }] }, '_id userName userEmail')
    if (res) {
      ctx.body = util.fail(`Duplicated User: ${res.userName} - ${res.userEmail}`)
    } else {
      const doc = await Counter.findOneAndUpdate({ _id: 'userId' }, { $inc: { sequence_value: 1 } }, { new: true, upsert: true })
      try {
        const user = new User({
          userId: doc.sequence_value,
          userName,
          userPwd: md5('123456'),
          userEmail,
          role: 1, 
          roleList,
          job,
          state,
          deptId,
          mobile
        })
        user.save();
        ctx.body = util.success('', 'User Create Success');
      } catch (error) {
        ctx.body = util.fail(error.stack, 'Failed to create user');
      }
    }
  } else {
    if (!deptId) {
      ctx.body = util.fail('Department cannot be empty', util.CODE.PARAM_ERROR)
      return;
    }
    try {
      const res = await User.findOneAndUpdate({ userId }, { mobile, job, state, roleList, deptId, })
      ctx.body = util.success({}, 'Update Successed')
    } catch (error) {
      ctx.body = util.fail(error.stack, 'Update failed')
    }
  }
})


router.get("/getPermissionList", async (ctx) => {
  let authorization = ctx.request.headers.authorization
  let { data } = util.decoded(authorization)
  let menuList = await getMenuList(data.role, data.roleList);
  let actionList = getAction(JSON.parse(JSON.stringify(menuList)))
  ctx.body = util.success({ menuList, actionList });
})

async function getMenuList(userRole, roleKeys) {
  let rootList = []
  if (userRole == 0) {
    rootList = await Menu.find({}) || []
  } else {
    let roleList = await Role.find({ _id: { $in: roleKeys } })
    let permissionList = []
    roleList.map(role => {
      let { checkedKeys, halfCheckedKeys } = role.permissionList;
      permissionList = permissionList.concat([...checkedKeys, ...halfCheckedKeys])
    })
    permissionList = [...new Set(permissionList)]
    rootList = await Menu.find({ _id: { $in: permissionList } })
  }
  return util.getTreeMenu(rootList, null, [])
}

function getAction(list) {
  let actionList = []
  const deep = (arr) => {
    while (arr.length) {
      let item = arr.pop();
      if (item.action) {
        item.action.map(action => {
          actionList.push(action.menuCode)
        })
      }
      if (item.children && !item.action) {
        deep(item.children)
      }
    }
  }
  deep(list)
  return actionList;
}
module.exports = router
