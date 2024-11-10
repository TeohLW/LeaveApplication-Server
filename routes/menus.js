const router = require('koa-router')()
const util = require('../utils/util') 
const Menu = require('../models/menuSchema')
const log4js = require('../utils/log4j')

router.prefix('/menu')

router.get('/list', async (ctx) => {
    const { menuName, menuState } = ctx.request.query
    const params = {}
    if (menuName) params.menuName = menuName
    if (menuState) params.menuState = menuState
    let rootList = await Menu.find(params) || []
    const permissionList = util.getTreeMenu(rootList, null, [])
    ctx.body = util.success(permissionList)
})

router.post('/operate', async (ctx) => {
    const { _id, action, ...params } = ctx.request.body
    let res, info
    try {
        if (action == 'add') {
            res = await Menu.create(params)
            info = 'Success'
        } else if (action == 'edit') {
            params.updateTime = new Date()
            res = await Menu.findByIdAndUpdate(_id, params)
            info = 'Update Success'
        } else {
            res = await Menu.findByIdAndRemove(_id)
            await Menu.deleteMany({ parentId: { $all: [_id] } })
            info = 'Delete Success'
        }
        ctx.body = util.success('', info)
    } catch (error) {
        ctx.body = util.fail(error.stack)
    }

})

module.exports = router