---
tags:
  - "#public"
---
# 背景
促使我部署网站的契机，是要和朋友一起旅游，我在obsidian上制作了旅游规划，需要同步给朋友。obsidian官方的发布工具需要花钱，我就选择了quartz框架来将obsidian内容转换为html，效果很好。起初是直接部署在github上，但是朋友反馈github的加载比较慢。我怀疑是github没有国内服务器部署，导致请求耗时较大，于是决定部署在别的服务器上。选择vercel作为部署平台（香港有服务器部署）

但是vercel的域名天然被GFW了，需要用自定义域名绕过去。虽然配置了自定义域名可以绕过GFW，但是访问速度仍然有点慢，估计是CDN调度不准确的问题，也就是DNS服务器返回的CDN节点距离我实际的位置比较远，访问就会有较大的延迟。

# 尝试
最初是在cloudflare上管理域名的DNS服务器，同时页面也是部署在cloudflare上。
尝试思路是：
- 页面域名 CNAME：指向 优选域名（自定义的，比如`china.mysite.com` ）
- 优选域名 A：指向固定优选ip
> 当时还不知道，有专门的优选域名

不过问题在于，cloudflare上创建的pages，绑定自定义域名后，该自定义域名无法用于指向优选域名（免费版）  
即：页面 -> 自定义域名 -x-> 优选域名

所以页面部署与DNS解析不能同时放在cloudflare上，可以页面部署在cloudflare、DNS解析在其他平台。或页面部署在其他平台、DNS解析在cloudflare
# 当前方法
页面迁移到vercel，DNS服务迁回域名注册商
- vercel页面绑定目标域名
- 修改DNS记录，将相关域名的国内访问，指向`name-china.vercel-dns.com` 服务器，该服务器会针对国内访问vercel做专门优化，实现优选ip效果。
vercel的DNS服务器会做专门的查询，判断当前有哪些vercel项目，绑定了同样的自定义域名，最后只会选最晚绑定生效的那个项目做为请求的返回。

另外发现一个网站[微测网 - 全球云服务监测平台](https://www.wetest.vip/)，如果页面部署在cloudflare等平台，可以尝试使用其中的DNS服务器

# 附件
发现了一些实用的工具网站：
- itdog.cn：查询自己网站的访问延迟
- whatsmydns.net：查询自己网站在全球各地DNS根服务器中，所记录的DNS服务器