// main.js
$(document).ready(function() {
    // 加载主机列表
    function loadHosts() {
        $.get('/api/hosts', function(data) {
            $('#hostTable tbody').empty();
            $('#hostSelect').empty();
            
            data.forEach(function(host) {
                // 添加到主机表格
                $('#hostTable tbody').append(`
                    <tr>
                        <td>${host.comment}</td>
                        <td>${host.address}</td>
                        <td>${host.username}</td>
                        <td>${host.port}</td>
                        <td>
                            <button class="btn btn-sm btn-primary edit-host" data-id="${host.id}">编辑</button>
                            <button class="btn btn-sm btn-danger delete-host" data-id="${host.id}">删除</button>
                            <button class="btn btn-sm btn-success connect-host" data-id="${host.id}">连接</button>
                        </td>
                    </tr>
                `);
                
                // 添加到选择框
                $('#hostSelect').append(`
                    <option value="${host.id}">${host.comment} (${host.address})</option>
                `);
            });
        });
    }

    // 批量添加主机
    $('#addHosts').click(function() {
        const hostsData = $('#batchInput').val().split('\n').map(line => {
            const [comment, address, username, port, password] = line.trim().split(' ');
            return { comment, address, username, port, password };
        }).filter(host => host.address);

        $.ajax({
            url: '/api/hosts/batch',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(hostsData),
            success: function() {
                $('#batchInput').val('');
                loadHosts();
                addLog('成功添加主机', 'success');
            },
            error: function(xhr) {
                addLog('添加主机失败: ' + xhr.responseText, 'error');
            }
        });
    });

    // 删除主机
    $(document).on('click', '.delete-host', function() {
        const hostId = $(this).data('id');
        if (confirm('确定要删除这台主机吗？')) {
            $.ajax({
                url: '/api/hosts/' + hostId,
                method: 'DELETE',
                success: function() {
                    loadHosts();
                    addLog('成功删除主机', 'success');
                },
                error: function(xhr) {
                    addLog('删除主机失败: ' + xhr.responseText, 'error');
                }
            });
        }
    });

    // 编辑主机
    $(document).on('click', '.edit-host', function() {
        const hostId = $(this).data('id');
        $.get('/api/hosts/' + hostId, function(host) {
            $('#editHostId').val(host.id);
            $('#editHostComment').val(host.comment);
            $('#editHostAddress').val(host.address);
            $('#editHostUsername').val(host.username);
            $('#editHostPort').val(host.port);
            $('#editHostPassword').val(''); // 出于安全考虑不显示原密码
            $('#editHostModal').modal('show');
        });
    });

    // 保存主机编辑
    $('#saveHostEdit').click(function() {
        const hostData = {
            id: $('#editHostId').val(),
            comment: $('#editHostComment').val(),
            address: $('#editHostAddress').val(),
            username: $('#editHostUsername').val(),
            port: $('#editHostPort').val(),
            password: $('#editHostPassword').val()
        };

        $.ajax({
            url: '/api/hosts/' + hostData.id,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(hostData),
            success: function() {
                $('#editHostModal').modal('hide');
                loadHosts();
                addLog('成功更新主机信息', 'success');
            },
            error: function(xhr) {
                addLog('更新主机失败: ' + xhr.responseText, 'error');
            }
        });
    });

    // 连接到主机
    $(document).on('click', '.connect-host', function() {
        const hostId = $(this).data('id');
        window.open(`/terminal/${hostId}`, '_blank', 'width=800,height=600');
    });

    // 发送命令
    $('#sendSingle').click(function() {
        const command = $('#commandInput').val();
        const selectedHosts = $('#hostSelect').val();
        
        if (!command) {
            addLog('请输入命令', 'error');
            return;
        }
        if (selectedHosts.length === 0) {
            addLog('请选择目标主机', 'error');
            return;
        }

        // 禁用按钮
        $('#sendSingle').prop('disabled', true);
        $('#sendAll').prop('disabled', true);

        executeCommand(command, selectedHosts).always(function() {
            // 恢复按钮
            $('#sendSingle').prop('disabled', false);
            $('#sendAll').prop('disabled', false);
        });
    });

    $('#sendAll').click(function() {
        const command = $('#commandInput').val();
        if (!command) {
            addLog('请输入命令', 'error');
            return;
        }

        // 禁用按钮
        $('#sendSingle').prop('disabled', true);
        $('#sendAll').prop('disabled', true);

        executeCommand(command, 'all').always(function() {
            // 恢复按钮
            $('#sendSingle').prop('disabled', false);
            $('#sendAll').prop('disabled', false);
        });
    });

    function executeCommand(command, hosts) {
        return $.ajax({
            url: '/api/execute',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                command: command,
                hosts: hosts
            }),
            success: function(response) {
                $('#commandInput').val('');
                addLog('命令执行结果:\n' + JSON.stringify(response, null, 2), 'success');
            },
            error: function(xhr) {
                addLog('命令执行失败: ' + xhr.responseText, 'error');
            }
        });
    }

    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `<div class="log-entry ${type}">[${timestamp}] ${message}</div>`;
        const logContainer = $('#logContainer');
        logContainer.append(logEntry);
        logContainer.scrollTop(logContainer[0].scrollHeight);
    }

    // 初始加载
    loadHosts();
});