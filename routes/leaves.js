const router = require('koa-router')()
const Leave = require('../models/leaveSchema')
const Dept = require('../models/deptSchema')
const User = require('../models/userSchema')
const util = require('../utils/util')
const jwt = require('jsonwebtoken')
const md5 = require('md5')
const log = require('../utils/log4j')

router.prefix('/leave')

router.get('/list', async (ctx) => {
    const { applyState, type } = ctx.request.query;
    const { page, skipIndex } = util.pager(ctx.request.query)
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization)
    try {
        let params = {};
        if (type == 'approve') {
            if (applyState == 1 || applyState == 2) {
                params.curAuditUserName = data.userName;
                params.$or = [{ applyState: 1 }, { applyState: 2 }]
            } else if (applyState > 2) { 
                params = { "auditFlows.userId": data.userId, applyState }
            } else {
                params = { "auditFlows.userId": data.userId }
            }
        } else {
            params = {
                "applyUser.userId": data.userId
            }
            if (applyState) params.applyState = applyState;
        }
        const query = Leave.find(params)
        const list = await query.skip(skipIndex).limit(page.pageSize)
        const total = await Leave.countDocuments(params);
        ctx.body = util.success({
            page: {
                ...page,
                total
            },
            list
        })

    } catch (error) {
        ctx.body = util.fail(`Failed:${error.stack}`)
    }
})

router.get("/count", async (ctx) => {
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    
    try {
        let params = {}
        params.curAuditUserName = data.userName;
        params.$or = [{ applyState: 1 }, { applyState: 2 }]
        const total = await Leave.countDocuments(params)
        ctx.body = util.success(total)
    } catch (error) {
        ctx.body = util.fail(`Failed${error.message}`)
    }
})

router.post("/operate", async (ctx) => {
    const { _id, action, ...params } = ctx.request.body
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization)

    if (action == 'create') {
        let orderNo = "XJ"
        orderNo += util.formateDate(new Date(), "yyyyMMdd");
        const total = await Leave.countDocuments()
        params.orderNo = orderNo + total;
        let id = data.deptId.pop()
        let dept = await Dept.findById(id)
        let userList = await Dept.find({ deptName: { $in: ['HR', 'Finance'] } })

        let auditUsers = dept.userName;
        let auditFlows = [
            { userId: dept.userId, userName: dept.userName, userEmail: dept.userEmail }
        ]
        userList.map(item => {
            auditFlows.push({
                userId: item.userId, userName: item.userName, userEmail: item.userEmail
            })
            auditUsers += ',' + item.userName;
        })

        params.auditUsers = auditUsers;
        params.curAuditUserName = dept.userName;
        params.auditFlows = auditFlows;
        params.auditLogs = []
        params.applyUser = {
            userId: data.userId,
            userName: data.userName,
            userEmail: data.userEmail
        }
        let res2 = await User.findByIdAndUpdate({ _id: data._id }, { $inc: { leave_balance: -1 } }, { new: true });
        let res = await Leave.create(params)
        ctx.body = util.success("", "Create Success")
    } else {
        let res = await Leave.findByIdAndUpdate(_id, { applyState: 5 })
        ctx.body = util.success('', "Update Success")
    }

})

router.post("/approve", async (ctx) => {
    const { action, remark, _id } = ctx.request.body;
    let authorization = ctx.request.headers.authorization;
    let { data } = util.decoded(authorization);
    let params = {}
    try {
        let doc = await Leave.findById(_id)
        let auditLogs = doc.auditLogs || [];
        if (action == "refuse") {
            params.applyState = 3;
        } else {
            if (doc.auditFlows.length == doc.auditLogs.length) {
                ctx.body = util.success('Complete')
                return;
            } else if (doc.auditFlows.length == doc.auditLogs.length + 1) {
                params.applyState = 4;
            } else if (doc.auditFlows.length > doc.auditLogs.length) {
                params.applyState = 2;
                params.curAuditUserName = doc.auditFlows[doc.auditLogs.length + 1].userName;
            }
        }
        auditLogs.push({
            userId: data.userId,
            userName: data.userName,
            createTime: new Date(),
            remark,
            action: action == 'refuse' ? "Rejected" : "Approved"
        })
        params.auditLogs = auditLogs;
        let res = await Leave.findByIdAndUpdate(_id, params);
        ctx.body = util.success("", "Success");
    } catch (error) {
        ctx.body = util.fail(`Error${error.message}`)
    }
})

module.exports = router;
