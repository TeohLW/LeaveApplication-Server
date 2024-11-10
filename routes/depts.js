const router = require('koa-router')()
const util = require('./../utils/util')
const Dept = require('./../models/deptSchema')

router.prefix('/dept')

router.get('/list', async (ctx) => {
    let { deptName } = ctx.request.query;
    let params = {}
    if (deptName) params.deptName = deptName;
    let rootList = await Dept.find(params)
    if (deptName) {
        ctx.body = util.success(rootList);
    } else {
        let tressList = getTreeDept(rootList, null, [])
        ctx.body = util.success(tressList)
    }
})



function getTreeDept(rootList, id, list) {
    for (let i = 0; i < rootList.length; i++) {
        let item = rootList[i]
        if (String(item.parentId.slice().pop()) == String(id)) {
            list.push(item._doc)
        }
    }
    list.map(item => {
        item.children = []
        getTreeDept(rootList, item._id, item.children)
        if (item.children.length == 0) {
            delete item.children
        } else if (item.children.length > 0 && item.children[0].menuType == 2) {
            item.action = item.children
        }
    })
    return list
}


router.post('/operate', async (ctx) => {
    const { _id, action, ...params } = ctx.request.body
    let res, info
    try {
        if (action == 'create') {
            res = await Dept.create(params)
            info = 'Create Success'
        } else if (action == 'edit') {
            res = params.updateTime = new Date()
            await Dept.findByIdAndUpdate(_id, params)
            info = 'Edit Success'
        } else if (action == 'delete') {
            res = await Dept.findByIdAndRemove(_id)
            await Dept.deleteMany({ parentId: { $all: [_id] } })
            info = 'Delete Success'
        }
        ctx.body = util.success('', info)
    } catch (error) {
        ctx.body = util.fail(error.stack)
    }

})

module.exports = router