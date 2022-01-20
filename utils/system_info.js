'use strict'

// Load `require` directives - external
const clc = require("cli-color"),
    si = require('systeminformation')
// Load `require` directives - internal

var error = clc.red.bold,
    warn = clc.yellow,
    notice = clc.blue,
    mag = clc.magenta.bold,
    mem = clc.green.bold,
    load = clc.yellow.bold,
    pros = clc.cyan.bold,
    blu = clc.blue.bold,
    txt = clc.black.italic

async function systemInfo() {

    try {

        var data = await si.cpu()
        console.log(mag('CPU Information:'))
        console.log(txt('- cores (# cores): ') + data.cores)
        console.log(txt('- physical cores (# physical cores): ') + data.physicalCores)
        console.log(txt('- processors (# processors): ') + data.processors)

        var data = await si.mem()
        console.log(blu('Memory Information:'))
        console.log(txt('- total (total memory in bytes): ') + data.total)
        console.log(txt('- free (not used in bytes): ') + data.free)
        console.log(txt('- used (used (incl. buffers/cache)): ') + data.used)
        console.log(txt('- active (used actively (excl. buffers/cache)): ') + data.active)
        console.log(txt('- available (potentially available (total - active)): ') + data.available)
        
        var data = await si.currentLoad()
        console.log(mag('Current Load Information:'))
        console.log(txt('- avgload (average load): ') + data.avgload)
        console.log(txt('- currentload (CPU load in %): ') + data.currentload)
        console.log(txt('- currentload_user (CPU load user in %): ') + data.currentload_user)
        console.log(txt('- currentload_system (CPU load system in %): ') + data.currentload_system)
        // console.log('- cpus[] (current loads per CPU in % + raw ticks): ' + JSON.stringify(data.cpus, undefined, 2))
        var data = await si.fullLoad()
        console.log(txt('- fullLoad (CPU full load since bootup in %): ') + data)

        var data = await si.processes()
        console.log(blu('Processes Information:'))
        console.log(txt('- all (# of all processes): ') + data.all)
        console.log(txt('- running (# of all processes running): ') + data.running)
        console.log(txt('- blocked (# of all processes blocked): ') + data.blocked)
        console.log(txt('- sleeping (# of all processes sleeping): ') + data.sleeping)
        console.log(txt('- unknown (# of all processes unknown status): ') + data.unknown)
        console.log(txt('- cpu (process % CPU): ') + data.cpu)
        console.log(txt('- mem (process % MEM): ') + data.mem)
        
    } catch (e) {
        console.log(error('Error - systemInfo() - > ' + e.message))
    }

}

module.exports = {
    systemInfo
}