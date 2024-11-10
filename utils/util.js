
const log4js = require('./log4j')
const jwt = require('jsonwebtoken')
const CODE = {
    SUCCESS: 200,
    PARAM_ERROR: 10001, 
    USER_ACCOUNT_ERROR: 20001,
    USER_LOGIN_ERROR: 30001, 
    BUSINESS_ERROR: 40001,
    AUTH_ERROR: 50001, 
}

module.exports = {
    pager({ pageNum = 1, pageSize = 10 }) {
        pageNum *= 1
        pageSize *= 1 
        const skipIndex = (pageNum - 1) * pageSize 
        return {
            page: {
                pageNum,
                pageSize
            },
            skipIndex
        }
    },
    success(data = '', msg = '', code = CODE.SUCCESS) {
        log4js.debug(data)
        return {
            code, data, msg
        }
    },
    fail(data = '', msg = '', code = CODE.BUSINESS_ERROR) {
        log4js.debug(msg)
        return {
            code, data, msg
        }
    },
    CODE,
    decoded(authorization) {
        if (authorization) {
            let token = authorization.split(' ')[1]
            return jwt.verify(token, 'employee-leave-management-system')
        }
        return ''
    },

    getTreeMenu(rootList, id, list) {
        for (let i = 0; i < rootList.length; i++) {
            let item = rootList[i]
            if (item.parentId !== null && String(item.parentId.slice().pop()) == String(id)) {
                list.push(item._doc)
            }
            
        }
        list.map(item => {
            item.children = []
            this.getTreeMenu(rootList, item._id, item.children)
            if (item.children.length == 0) {
                delete item.children
            } else if (item.children.length > 0 && item.children[0].menuType == 2) {
                item.action = item.children
            }
        })
        return list
    },
    formateDate(date, rule) {
        let fmt = rule || 'yyyy-MM-dd hh:mm:ss'
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, date.getFullYear())
        }
        const o = {
            // 'y+': date.getFullYear(),
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds()
        }
        for (let k in o) {
            if (new RegExp(`(${k})`).test(fmt)) {
                const val = o[k] + '';
                fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? val : ('00' + val).substr(val.length));
            }
        }
        return fmt;
    },
}