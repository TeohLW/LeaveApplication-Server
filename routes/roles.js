const router = require('koa-router')()
const Role = require('./../models/roleSchema')
const util = require('./../utils/util')
const jwt = require('jsonwebtoken')
const md5 = require('md5')

router.prefix('/roles')  

router.get('/alllist', async (ctx) => {
    try {
        const list = await Role.find({}, "_id roleName")
        ctx.body = util.success(list)
    } catch (error) {
        ctx.body = util.fail(`Error:${error.stack}`)
    }
})

router.get('/list', async (ctx) => {
    const { roleName } = ctx.request.query
    const { page, skipIndex } = util.pager(ctx.request.query)
    try {
        let params = {}
        if (roleName) params.roleName = roleName
        const query = Role.find(params)
        const list = await query.skip(skipIndex).limit(page.pageSize)
        const total = await Role.countDocuments(params)
        ctx.body = util.success({
            list,
            page: {
                ...page,
                total
            }
        })
    } catch (error) {
        ctx.body = util.fail(`Error:${error.stack}`)
    }
})

router.post('/operate', async (ctx) => {
    const { _id, roleName, remark, action } = ctx.request.body
    let res, info
    try {
        if (action == 'create') {
            res = await Role.create({ roleName, remark })
            info = "Create Sucess"
        } else if (action == 'edit') {
            if (_id) {
                let params = { roleName, remark }
                params.update = new Date()
                res = await Role.findByIdAndUpdate(_id, params)
                info = "Edit Success"
            } else {
                ctx.body = util.fail('Error params: _id')
                return
            }
        } else {
            if (_id) {
                res = await Role.findByIdAndRemove(_id)
                info = "Delete Success"
            } else {
                ctx.body = util.fail('Error Params: _id')
                return
            }
        }
        ctx.body = util.success(res, info)
    } catch (error) {
        ctx.body = util.fail(`Error${error.stack}`)
    }
})

router.post('/update/permission', async (ctx) => {
    const { _id, permissionList } = ctx.request.body
    try {
        let params = { permissionList, update: new Date() }
        let res = await Role.findByIdAndUpdate(_id, params)
        ctx.body = util.success(res, 'Permission Success')
    } catch (error) {
        ctx.body = util.fail('Permission Error', error.stack)
    }
})
module.exports = router
