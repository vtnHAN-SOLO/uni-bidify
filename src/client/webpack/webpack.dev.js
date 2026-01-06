import { merge } from 'webpack-merge'
import common from './webpack.common.js'
import path from 'path'
import { fileURLToPath } from 'url'
import open from 'open'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default merge(common, {
	mode: 'development',
	devtool: 'inline-source-map',
	devServer: {
		static: {
			directory: path.join(__dirname, '..', 'public'), // Serves files from /public
		},
		historyApiFallback: true, // For React Router
		port: 8080,
		open: false,
		onListening: function (devServer) {
			const port = devServer.server.address().port
			const url = `http://localhost:${port}`

			let isFirstCompilation = true

			devServer.compiler.hooks.done.tap('OpenBrowser', () => {
				if (isFirstCompilation) {
					isFirstCompilation = false
					console.log(
						'First compilation done, opening browser in 2 seconds...'
					)

					// Đợi thêm 2 giây để bundle hoàn tất
					setTimeout(() => {
						open(url)
					}, 2000)
				}
			})
		},
		hot: true, // Hot Module Replacement
	},
})
