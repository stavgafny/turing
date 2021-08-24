import os
import time

filename = "packed_code.txt"

# Ignore:
exceptions = [filename, "line_counter.py", "p5.min.js", ".gitignore", "README.md", ".git"]


data = ""

def rundir(dir):
	_data = ""
	files = os.listdir(dir)
	for file in files:
		try:
			if os.path.isdir(file) and file not in exceptions:
				_data += rundir(dir + "\\" + file)
			elif file not in exceptions:
				with open(dir + "\\" + file, "r") as f:
					_data += "\n" + f.read()
		except: pass
	return _data



os.system("color c")
os.system("cls")

print("Running on dir: " + os.getcwd())
print("Ignoring: [" + " | ".join(exceptions) + "]")
time.sleep(1)


data = rundir("./")

print("\r\n")
print("Letters: %s" % len(data))
print("Lines: %s" % len(data.split("\n")))
with open(filename, "w") as f:
	f.write(data)
os.system("pause")
