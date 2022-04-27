import sys
import os
import shutil
from numpy import size
import tqdm
import math

# the root path it should  work through
the_path = "G:\Samples\Cymatics"


# change this if the extenion could intefer (not sure why tho)
add_path = "_temp_copy"


def main():
    try:
        result = [
            os.path.join(dp, f)
            for dp, dn, filenames in os.walk(the_path)
            for f in filenames
            if not f.endswith(add_path)
        ]

        processed = []
        if os.exists("processed.txt"):
            with open("proccessed.txt") as f:
                processed = f.readlines()

        print(len(result))

        # detecting total size (for first bar)
        size_total = 0
        for i in tqdm.tqdm(range(len(result))):
            size_total += os.path.getsize(result[i])

        pbar = tqdm.tqdm(total=math.floor(size_total / 1000000))
        for i in tqdm.tqdm(range(len(result))):
            if result[i] not in processed:
                size_before = os.path.getsize(result[i])
                os.rename(result[i], result[i] + add_path)
                pbar.set_description(
                    "Copying: "
                    + result[i]
                    + "  "
                    + str(math.floor(os.path.getsize(result[i] + add_path) / 1000000))
                    + "mb"
                )
                shutil.copy(result[i] + add_path, result[i])
                pbar.update(math.floor(os.path.getsize(result[i]) / 1000000))
                if size_before != os.path.getsize(result[i]):
                    print("Folder size: " + str(size_before) + " bytes   " + str(os.path.getsize(result[i]) + " bytes"))
                    sys.exit()
                else:
                    os.remove(result[i] + add_path)
                    processed.append(result[i])

        pbar.close()
        print("DONE")
        with open("processed.txt", "w") as f:
            for item in processed:
                f.write(item)
    finally:
        with open("processed.txt", "w") as f:
            for item in processed:
                f.write(item)


if __name__ == "__main__":
    main()
